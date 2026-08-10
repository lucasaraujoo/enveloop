"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Target, TrendingDown } from "lucide-react";
import { Goal } from "@/types/goal.types";
import { Envelope } from "@/types/envelope.types";

type Mode = "transfer" | "withdraw";

interface GoalTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  // For "transfer": these are pre-filled from the month context
  defaultMonthYear?: string; // "YYYY-MM"
  targetSaldo?: number;
  // For "withdraw": this goal is locked and pre-filled
  lockedGoal?: Goal & { balance: number };
  goals?: (Goal & { balance: number })[]; // Active goals with current balance
  envelopes?: Envelope[];
  onTransfer: (params: {
    referenceMonthYear: string;
    goalId: string;
    amount: number;
    description: string;
    envelopeId?: string;
    date: Date;
  }) => Promise<void>;
  onWithdraw: (params: {
    referenceMonthYear: string;
    goalId: string;
    amount: number;
    description: string;
    date: Date;
    currentGoalBalance: number;
  }) => Promise<void>;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function parseCurrency(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) / 100 : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function toMonthYear(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function fromMonthYear(my: string): { month: number; year: number } {
  const [y, m] = my.split("-").map(Number);
  return { month: m, year: y };
}
export function GoalTransferModal({
  open,
  onOpenChange,
  mode,
  defaultMonthYear,
  targetSaldo,
  lockedGoal,
  goals = [],
  envelopes = [],
  onTransfer,
  onWithdraw,
}: GoalTransferModalProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState<number>(0);
  const [envelopeId, setEnvelopeId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTransfer = mode === "transfer";
  const activeGoal = isTransfer ? goals.find((g) => g.id === selectedGoalId) : lockedGoal;
  
  const maxAmount = mode === "withdraw" 
    ? lockedGoal?.balance 
    : (targetSaldo !== undefined ? targetSaldo : undefined);

  // Initialize from defaults
  useEffect(() => {
    if (open) {
      if (defaultMonthYear) {
        const [y, m] = defaultMonthYear.split("-");
        setYear(Number(y));
        setMonth(Number(m));
      } else {
        setYear(new Date().getFullYear());
        setMonth(new Date().getMonth() + 1);
      }
      
      if (mode === "transfer") {
        setAmount(targetSaldo ? Math.max(0, targetSaldo) : 0);
        setEnvelopeId("");
        setDescription("Transferência para objetivo");
      } else {
        setAmount(0);
        setEnvelopeId("");
        setDescription("Saque de objetivo");
      } 
      
      if (mode === "withdraw" && lockedGoal) {
        setSelectedGoalId(lockedGoal.id!);
      } else {
        setSelectedGoalId(goals[0]?.id ?? "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Atualiza a descrição automaticamente quando o objetivo muda, 
  // caso o usuário ainda não tenha digitado uma descrição customizada.
  useEffect(() => {
    if (activeGoal?.name) {
      setDescription((prev) => {
        if (
          prev === "" ||
          prev.startsWith("Transferência para objetivo") ||
          prev.startsWith("Saque de objetivo")
        ) {
          return mode === "transfer"
            ? `Transferência para objetivo - ${activeGoal.name}`
            : `Saque de objetivo - ${activeGoal.name}`;
        }
        return prev;
      });
    }
  }, [activeGoal?.name, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || amount <= 0) return;

    const monthYear = toMonthYear(month, year);
    setIsSubmitting(true);
    try {
      if (mode === "transfer") {
        await onTransfer({
          referenceMonthYear: monthYear,
          goalId: selectedGoalId,
          amount,
          description,
          envelopeId: envelopeId || undefined,
          date: new Date(),
        });
      } else {
        await onWithdraw({
          referenceMonthYear: monthYear,
          goalId: selectedGoalId,
          amount,
          description,
          date: new Date(),
          currentGoalBalance: activeGoal?.balance ?? 0,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTransfer ? (
              <>
                <Target className="h-5 w-5 text-violet-500" />
                Transferir para Objetivo
              </>
            ) : (
              <>
                <TrendingDown className="h-5 w-5 text-emerald-500" />
                Sacar do Objetivo
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Objetivo */}
          <div className="grid gap-2">
            <Label>Objetivo</Label>
            {mode === "withdraw" && lockedGoal ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{lockedGoal.name}</span>
                <span className="text-muted-foreground text-xs">
                  Saldo: {formatCurrency(lockedGoal.balance)}
                </span>
              </div>
            ) : (
              <Select value={selectedGoalId} onValueChange={(v) => setSelectedGoalId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um objetivo">
                    {goals.find((g) => g.id === selectedGoalId)?.name || "Selecione um objetivo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id!}>
                      {g.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({formatCurrency(g.balance)})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mês */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{isTransfer ? "Mês de Origem" : "Mês de Destino"}</Label>
              <Select
                value={month.toString()}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ano</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Valor */}
          <div className="grid gap-2">
            <Label>
              Valor (R$)
              {maxAmount !== undefined && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  máx: {formatCurrency(maxAmount)}
                </span>
              )}
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={formatCurrency(amount)}
              onChange={(e) => {
                const v = parseCurrency(e.target.value);
                setAmount(maxAmount !== undefined && maxAmount > 0 ? Math.min(v, maxAmount) : v);
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
              required
            />
          </div>

          {/* Envelope (apenas no modo transfer) */}
          {isTransfer && envelopes.length > 0 && (
            <div className="grid gap-2">
              <Label>Envelope (opcional)</Label>
              <Select
                value={envelopeId}
                onValueChange={(v) => setEnvelopeId((v ?? "none") === "none" ? "" : (v ?? ""))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum">
                    {envelopeId && envelopeId !== "none"
                      ? envelopes.find((e) => e.id === envelopeId)?.name || "Nenhum"
                      : "Nenhum"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {envelopes.map((env) => (
                    <SelectItem key={env.id} value={env.id!}>
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Descrição */}
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedGoalId ||
                amount <= 0 ||
                (mode === "withdraw" && amount > (activeGoal?.balance ?? 0))
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : isTransfer ? (
                "Confirmar Transferência"
              ) : (
                "Confirmar Saque"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
