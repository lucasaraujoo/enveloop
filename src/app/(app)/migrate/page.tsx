"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { transactionService } from "@/services/transaction.service";
import { accountService } from "@/services/account.service";
import { cardService } from "@/services/card.service";
import { userDoc } from "@/lib/firestore";
import { writeBatch, getFirestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Página de migração one-shot.
 * Lê TODAS as transações do usuário uma vez e recalcula:
 * - account.balance para cada conta
 * - card.pendingBills para cada cartão
 *
 * Deve ser executada uma única vez para usuários que já possuem dados.
 * Após a migração, novos lançamentos mantêm os campos atualizados incrementalmente.
 */
export default function MigratePage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  async function runMigration() {
    if (!user) return;
    setStatus("running");
    setLog([]);

    try {
      addLog("Buscando contas e cartões...");
      const [accounts, cards] = await Promise.all([
        accountService.getAccounts(user.uid),
        cardService.getCards(user.uid),
      ]);
      addLog(`  ${accounts.length} conta(s) encontrada(s).`);
      addLog(`  ${cards.length} cartão(ões) encontrado(s).`);

      addLog("Buscando todas as transações (full scan único)...");
      // We call getTransactionsByMonths with a broad range approach, 
      // but since we need ALL transactions for migration we use a direct fetch here.
      const { getDocs } = await import("firebase/firestore");
      const { userCol } = await import("@/lib/firestore");
      const col = userCol(user.uid, "transactions");
      const snap = await getDocs(col);
      const allTransactions = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      // Ordena cronologicamente pela data de registro (createdAt) para simular o crescimento exato dos saldos
      allTransactions.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      addLog(`  ${allTransactions.length} transação(ões) encontrada(s).`);

      // Calculate balance per account
      const balanceMap: Record<string, number> = {};
      accounts.forEach((a) => {
        balanceMap[a.id!] = a.initialBalance ?? 0;
      });

      const pendingBillsMap: Record<string, number> = {};
      cards.forEach((c) => {
        pendingBillsMap[c.id!] = 0;
      });

      addLog("Calculando saldo das contas (cronológico)...");
      for (const t of allTransactions) {
        // Lógica das contas
        if (t.type === "income" && t.accountId && balanceMap[t.accountId] !== undefined) {
          balanceMap[t.accountId] += t.amount;
        } else if (t.type === "expense" && t.status === "paid" && t.accountId && balanceMap[t.accountId] !== undefined) {
          balanceMap[t.accountId] -= t.amount;
        } else if (t.type === "bill_payment" && t.accountId && balanceMap[t.accountId] !== undefined) {
          balanceMap[t.accountId] -= t.amount;
        } 
      }

      addLog("Construindo linha do tempo de eventos (Event Log) para os cartões...");
      const events: Array<{ time: number; type: "ADD" | "SUBTRACT" | "PAYMENT"; amount: number; cardId: string }> = [];

      for (const t of allTransactions) {
        if (!t.cardId || pendingBillsMap[t.cardId] === undefined) continue;

        const timeCreated = t.createdAt?.seconds || 0;
        const timeUpdated = t.updatedAt?.seconds || timeCreated;

        if (t.type === "card_purchase") {
          // A compra sempre aumenta o saldo no momento da sua criação
          events.push({ time: timeCreated, type: "ADD", amount: t.amount, cardId: t.cardId });
          
          // Se for estornada ou cancelada, ela reduz o saldo no momento em que a ação ocorreu (updatedAt)
          if (t.status === "reversed" || t.status === "cancelled") {
            events.push({ time: timeUpdated, type: "SUBTRACT", amount: t.amount, cardId: t.cardId });
          }
        } else if (t.type === "bill_payment") {
          // O pagamento abate a fatura no momento de sua criação
          events.push({ time: timeCreated, type: "PAYMENT", amount: t.amount, cardId: t.cardId });
        }
      }


      // Ordenar eventos cronologicamente pela linha do tempo misturando criação e alteração
      events.sort((a, b) => a.time - b.time);

      addLog("Processando eventos do cartão cronologicamente...");
      for (const ev of events) {
        if (ev.type === "ADD") {
          pendingBillsMap[ev.cardId] += ev.amount;
        } else if (ev.type === "SUBTRACT") {
          // Pode gerar saldo negativo (crédito real) no cartão se o estorno ocorrer após o pagamento
          pendingBillsMap[ev.cardId] -= ev.amount;
        } else if (ev.type === "PAYMENT") {
          // O pagamento tem o piso de 0 para não gerar crédito falso em caso de superpagamento
          pendingBillsMap[ev.cardId] = Math.max(0, pendingBillsMap[ev.cardId] - ev.amount);
        }
      }

      addLog("Gravando saldos no Firestore...");
      // Firestore batch limit is 500. For typical usage this is fine.
      const batch = writeBatch(db);

      accounts.forEach((a) => {
        const newBalance = balanceMap[a.id!];
        addLog(`  Conta "${a.name}": balance = R$ ${newBalance.toFixed(2)}`);
        const ref = userDoc(user.uid, "accounts", a.id!);
        batch.update(ref, { balance: newBalance });
      });

      cards.forEach((c) => {
        const newPending = pendingBillsMap[c.id!];
        addLog(`  Cartão "${c.name}": pendingBills = R$ ${newPending.toFixed(2)}`);
        const ref = userDoc(user.uid, "cards", c.id!);
        batch.update(ref, { pendingBills: newPending });
      });

      await batch.commit();
      addLog("✅ Migração concluída com sucesso!");
      setStatus("done");
      toast.success("Migração concluída!");
    } catch (err: any) {
      addLog(`❌ Erro: ${err.message}`);
      setStatus("error");
      toast.error("Erro durante a migração.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Migração de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recalcula o saldo atual de cada conta e o valor de fatura pendente de cada cartão com base no histórico completo de transações.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-card space-y-3">
        <p className="text-sm font-medium">O que esta migração faz:</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Lê todas as suas transações uma única vez</li>
          <li>Calcula o saldo correto de cada conta</li>
          <li>Calcula o total de faturas pendentes de cada cartão</li>
          <li>Atualiza os documentos no Firestore atomicamente</li>
        </ul>
        <p className="text-xs text-amber-600 font-medium">
          ⚠️ Execute apenas uma vez. Após isso, os saldos são mantidos automaticamente a cada novo lançamento.
        </p>
      </div>

      <Button
        onClick={runMigration}
        disabled={status === "running" || status === "done"}
        className="w-full"
      >
        {status === "running" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {status === "done" && <CheckCircle2 className="mr-2 h-4 w-4" />}
        {status === "error" && <AlertTriangle className="mr-2 h-4 w-4" />}
        {status === "idle" && "Executar Migração"}
        {status === "running" && "Executando..."}
        {status === "done" && "Migração Concluída"}
        {status === "error" && "Tentar Novamente"}
      </Button>

      {log.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30 font-mono text-xs space-y-0.5 max-h-64 overflow-y-auto">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
