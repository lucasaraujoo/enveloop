"use client";

import { useTransactions } from "../hooks/useTransactions";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { useCards } from "@/features/cards/hooks/useCards";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useEnvelopes } from "@/features/envelopes/hooks/useEnvelopes";
import { Loader2, Trash2, ArrowUpRight, ArrowDownRight, CreditCard, ArrowRightLeft, Filter, RotateCcw, ChevronLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Transaction } from "@/types/transaction.types";
import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { transactionService } from "@/services/transaction.service";

interface TransactionListProps {
  monthYears: string[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const TYPE_LABELS: Record<string, string> = {
  all: "Todos os tipos",
  expense: "Despesas",
  income: "Receitas",
  card_purchase: "Compras no Cartão",
  bill_payment: "Pagamentos de Fatura",
  month_transfer_out: "Transferências (Saída)",
  month_transfer_in: "Transferências (Entrada)",
  goal_transfer: "Transferência p/ Objetivo",
  goal_withdraw: "Saque de Objetivo",
};

export function TransactionList({ monthYears }: TransactionListProps) {
  const { data: transactions, isLoading, isError, deleteMutation, reverseMutation, reverseInstallmentMutation, deleteInstallmentMutation } = useTransactions(monthYears);
  const { user } = useAuth();
  const { accountsQuery } = useAccounts();
  const { cardsQuery } = useCards();
  const { categoriesQuery } = useCategories();
  const { envelopesQuery } = useEnvelopes();

  const accounts = accountsQuery.data;
  const cards = cardsQuery.data;
  const categories = categoriesQuery.data;
  const envelopes = envelopesQuery.data;

  const [filterType, setFilterType] = useState<string>("all");
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [filterCardId, setFilterCardId] = useState<string>("all");
  const [filterEnvelopeId, setFilterEnvelopeId] = useState<string>("all");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);

  // Extract unique goals from transactions for display
  const goalIds = [...new Set(
    (transactions ?? []).filter((t) => t.goalId).map((t) => t.goalId!)
  )];
  // We'll resolve goal names from goalId via a goalMap passed externally or inline lookup;
  // For now, we store a simple placeholder — the component resolves via getAccountOrCardName.
  const goalMap = new Map<string, string>(); // will be populated below

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-red-500">
        Erro ao carregar transações.
      </div>
    );
  }

  const filteredTransactions = (transactions ?? []).filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterAccountId !== "all" && t.accountId !== filterAccountId) return false;
    if (filterCardId !== "all" && t.cardId !== filterCardId) return false;
    if (filterEnvelopeId !== "all" && t.envelopeId !== filterEnvelopeId) return false;
    if (filterCategoryId !== "all" && t.categoryId !== filterCategoryId) return false;
    return true;
  });

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center p-12 text-muted-foreground border rounded-lg bg-card">
        Nenhuma transação encontrada para este mês.
      </div>
    );
  }

  const getIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "income":
      case "month_transfer_in":
      case "goal_withdraw":
        return <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
      case "expense":
      case "month_transfer_out":
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case "card_purchase":
        return <CreditCard className="h-4 w-4 text-amber-500" />;
      case "bill_payment":
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      case "goal_transfer":
        return <Target className="h-4 w-4 text-violet-500" />;
    }
  };

  const getAccountOrCardName = (t: Transaction) => {
    if (t.type === "card_purchase" || t.type === "bill_payment") {
      const card = cards?.find((c) => c.id === t.cardId);
      return card?.name || "Cartão desconhecido";
    }
    if (t.type === "goal_transfer" || t.type === "goal_withdraw") {
      // goalId references may point to soft-deleted goals — handle gracefully
      return t.description || "Objetivo";
    }
    if (t.accountId) {
      const acc = accounts?.find((a) => a.id === t.accountId);
      return acc?.name || "Conta desconhecida";
    }
    return "-";
  };

  const getEnvelopeName = (envelopeId?: string) => {
    if (!envelopeId) return null;
    return envelopes?.find((e) => e.id === envelopeId)?.name ?? "Envelope desconhecido";
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories?.find((c) => c.id === categoryId)?.name;
  };

  return (
    <div className="space-y-4">
      {/* Botão Filtros */}
      <div className="flex justify-start">
        <Button 
          variant="outline" 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Container de Filtros */}
      {isFiltersOpen && (
        <div className="flex flex-wrap gap-2 p-4 rounded-md border bg-card/50">
        {/* Tipo */}
        <Select value={filterType} onValueChange={(val) => setFilterType(val || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {TYPE_LABELS[filterType] ?? "Todos os tipos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="card_purchase">Compras no Cartão</SelectItem>
            <SelectItem value="bill_payment">Pagamentos de Fatura</SelectItem>
            <SelectItem value="month_transfer_out">Transferências (Saída)</SelectItem>
            <SelectItem value="month_transfer_in">Transferências (Entrada)</SelectItem>
            <SelectItem value="goal_transfer">Transferência p/ Objetivo</SelectItem>
            <SelectItem value="goal_withdraw">Saque de Objetivo</SelectItem>
          </SelectContent>
        </Select>

        {/* Conta */}
        {(accounts?.length ?? 0) > 0 && (
          <Select value={filterAccountId} onValueChange={(val) => setFilterAccountId(val || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {filterAccountId === "all"
                  ? "Todas as contas"
                  : accounts?.find((a) => a.id === filterAccountId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={acc.id!}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Cartão */}
        {(cards?.length ?? 0) > 0 && (
          <Select value={filterCardId} onValueChange={(val) => setFilterCardId(val || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {filterCardId === "all"
                  ? "Todos os cartões"
                  : cards?.find((c) => c.id === filterCardId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cards?.map((card) => (
                <SelectItem key={card.id} value={card.id!}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Envelope */}
        {(envelopes?.length ?? 0) > 0 && (
          <Select value={filterEnvelopeId} onValueChange={(val) => setFilterEnvelopeId(val || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {filterEnvelopeId === "all"
                  ? "Todos os envelopes"
                  : envelopes?.find((e) => e.id === filterEnvelopeId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os envelopes</SelectItem>
              {envelopes?.map((env) => (
                <SelectItem key={env.id} value={env.id!}>
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Categoria */}
        {(categories?.length ?? 0) > 0 && (
          <Select value={filterCategoryId} onValueChange={(val) => setFilterCategoryId(val || "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>
                {filterCategoryId === "all"
                  ? "Todas as categorias"
                  : categories?.find((c) => c.id === filterCategoryId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id!}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      )}

      {/* Lista de Transações */}
      <div className="flex flex-col gap-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground border rounded-lg bg-card">
            Nenhum lançamento encontrado para este filtro.
          </div>
        ) : (
          filteredTransactions.map((t) => (
            <TransactionItem
              key={t.id}
              t={t}
              getIcon={getIcon}
              getAccountOrCardName={getAccountOrCardName}
              getEnvelopeName={getEnvelopeName}
              getCategoryName={getCategoryName}
              reverseMutation={reverseMutation}
              deleteMutation={deleteMutation}
              reverseInstallmentMutation={reverseInstallmentMutation}
              deleteInstallmentMutation={deleteInstallmentMutation}
              userId={user?.uid}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TransactionItem({
  t,
  getIcon,
  getAccountOrCardName,
  getEnvelopeName,
  getCategoryName,
  reverseMutation,
  deleteMutation,
  reverseInstallmentMutation,
  deleteInstallmentMutation,
  userId,
}: {
  t: Transaction;
  getIcon: (type: Transaction["type"]) => React.ReactNode;
  getAccountOrCardName: (t: Transaction) => string;
  getEnvelopeName: (id?: string) => string | null;
  getCategoryName: (id?: string) => string | undefined | null;
  reverseMutation: any;
  deleteMutation: any;
  reverseInstallmentMutation: any;
  deleteInstallmentMutation: any;
  userId?: string;
}) {
  const [showActions, setShowActions] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  const [installmentDialogType, setInstallmentDialogType] = useState<"delete" | "reverse">("delete");
  const [installmentGroupInfo, setInstallmentGroupInfo] = useState<{
    total: number;
    paidCount: number;
    pendingCount: number;
  } | null>(null);
  const [isLoadingGroupInfo, setIsLoadingGroupInfo] = useState(false);

  const date = (t.date as any)?.seconds
    ? new Date((t.date as any).seconds * 1000)
    : new Date(t.date as any);
  const envName = getEnvelopeName(t.envelopeId);
  const catName = getCategoryName(t.categoryId);

  const isPositive = t.type === "income" || t.type === "month_transfer_in" || t.type === "goal_withdraw";
  const isReversed = t.status === "reversed";
  const isCancelled = t.status === "cancelled";

  const amountColor = isCancelled
    ? "text-muted-foreground line-through"
    : isReversed
    ? "text-[#95b0a1] line-through"
    : isPositive
    ? "text-emerald-500"
    : t.type === "goal_transfer"
    ? "text-violet-500"
    : t.type === "month_transfer_out" || t.type === "expense" || t.type === "bill_payment" || t.type === "card_purchase"
    ? "text-red-500"
    : "text-foreground";

  const hideSign =
    t.type === "card_purchase" ||
    t.type === "month_transfer_in" ||
    t.type === "month_transfer_out" ||
    t.type === "goal_transfer" ||
    t.type === "goal_withdraw";

  const isInstallment = !!t.installmentId;

  const loadInstallmentGroupInfo = async () => {
    if (!userId || !t.installmentId) return;
    setIsLoadingGroupInfo(true);
    try {
      const txs = await transactionService.getTransactionsByInstallmentId(
        userId,
        t.installmentId
      );
      const paidCount = txs.filter((x) => x.status === "paid").length;
      const pendingCount = txs.filter((x) => x.status === "pending").length;
      setInstallmentGroupInfo({ total: txs.length, paidCount, pendingCount });
    } catch {
      toast.error("Erro ao carregar informações das parcelas.");
    } finally {
      setIsLoadingGroupInfo(false);
    }
  };

  const handleInstallmentDelete = async () => {
    if (!t.installmentId) return;
    // If group has paid parcels, user should use reverse
    if (installmentGroupInfo && installmentGroupInfo.paidCount > 0) {
      // This case is handled by the dialog offering reverse
      return;
    }
    try {
      await deleteInstallmentMutation.mutateAsync(t.installmentId);
      setInstallmentDialogOpen(false);
      toast.success("Todas as parcelas foram excluídas.");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao excluir parcelas.");
    }
  };

  const handleInstallmentReverse = async () => {
    if (!t.installmentId) return;
    try {
      await reverseInstallmentMutation.mutateAsync(t.installmentId);
      setInstallmentDialogOpen(false);
      toast.success("Parcelas estornadas com sucesso.");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao estornar parcelas.");
    }
  };

  const openInstallmentDialog = async (type: "delete" | "reverse") => {
    setInstallmentDialogType(type);
    setInstallmentDialogOpen(true);
    await loadInstallmentGroupInfo();
  };

  // Determine installment dialog content
  const allPending = installmentGroupInfo && installmentGroupInfo.paidCount === 0;
  const hasPaid = installmentGroupInfo && installmentGroupInfo.paidCount > 0;

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      {/* Ícone */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        {getIcon(t.type)}
      </div>

      {/* Detalhes principais */}
      <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 gap-0 sm:gap-4">
        {/* Esquerda: título + data/conta */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{t.description}</span>
            {t.status === "pending" && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                Pendente
              </span>
            )}
            {t.status === "reversed" && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-[#95b0a1]/15 px-2 py-0.5 text-[10px] font-medium text-[#95b0a1]">
                Estornado
              </span>
            )}
            {t.status === "cancelled" && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                Cancelado
              </span>
            )}
          </div>

          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <span className="shrink-0">
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(date)}
            </span>
            <span className="mx-1.5 shrink-0">•</span>
            <span className="truncate">{getAccountOrCardName(t)}</span>
          </div>
        </div>

        {/* Tags (Envelope / Categoria) */}
        {envName && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5 sm:mt-0 sm:shrink-0">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-primary">
              {envName}
            </span>
            {catName && (
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                • {catName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Valores e Ações */}
      <div className="flex items-center shrink-0 overflow-hidden">
        <span className={`font-semibold text-sm sm:text-base whitespace-nowrap ${amountColor} mr-2 sm:mr-3`}>
          {!hideSign && (isPositive ? "+ " : "- ")}{formatCurrency(t.amount)}
        </span>

        <button
          onClick={() => setShowActions(!showActions)}
          className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors -mr-1"
          title="Ver opções"
        >
          <ChevronLeft className={`h-5 w-5 transition-transform duration-200 ${showActions ? "rotate-180" : ""}`} />
        </button>

        <div
          className={`flex items-center gap-2 transition-all duration-300 ease-in-out ${
            showActions ? "max-w-[100px] opacity-100 ml-2 sm:ml-3" : "max-w-0 opacity-0 ml-0"
          }`}
        >
          {/* Botão Estornar — apenas para card_purchase já paga */}
          {t.type === "card_purchase" && t.status === "paid" && (
            isInstallment ? (
              <button
                title="Estornar parcelas"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                onClick={() => openInstallmentDialog("reverse")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : (
              <Dialog>
                <DialogTrigger
                  title="Estornar compra"
                  className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Estornar Compra</DialogTitle>
                    <DialogDescription>
                      Esta compra já foi paga na fatura. O estorno irá gerar um crédito de{" "}
                      <strong>{formatCurrency(t.amount)}</strong> no cartão, que será abatido
                      automaticamente das próximas faturas pendentes. Esta ação não pode ser desfeita.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors">
                      Cancelar
                    </DialogTrigger>
                    <Button
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-50"
                      onClick={() => reverseMutation.mutate(t.id!)}
                      disabled={reverseMutation.isPending}
                    >
                      {reverseMutation.isPending ? "Estornando..." : "Confirmar Estorno"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )
          )}

          {/* Botão Excluir */}
          {t.billPaymentId ? (
            <button
              onClick={() =>
                toast.error(
                  "Esta transação está vinculada a um pagamento de fatura. Exclua o pagamento da fatura primeiro."
                )
              }
              title="Excluir lançamento"
              className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : isInstallment && t.type === "card_purchase" ? (
            <button
              onClick={() => openInstallmentDialog("delete")}
              title="Excluir lançamento"
              className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <Dialog>
              <DialogTrigger
                title="Excluir lançamento"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir Lançamento</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja excluir &ldquo;{t.description}&rdquo;?
                    {(t.type === "month_transfer_in" || t.type === "month_transfer_out") &&
                      " Esta é uma transferência entre meses — a transação correspondente no outro mês também será excluída."}
                    {t.type === "bill_payment" &&
                      " Este pagamento de fatura será revertido e as compras associadas voltam para o status Pendente."}
                    {t.type === "goal_transfer" &&
                      " Esta transferência será removida e o saldo deste mês será restaurado. O saldo do objetivo também diminuirá."}
                    {t.type === "goal_withdraw" &&
                      " Este saque será removido e o crédito deste mês será revertido. O saldo do objetivo aumentará novamente."}
                    {t.status === "reversed" &&
                      " Esta compra foi estornada. A exclusão removerá o crédito gerado por ela."}{" "}
                    Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors">
                    Cancelar
                  </DialogTrigger>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(t.id!)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Installment Group Dialog */}
      <Dialog open={installmentDialogOpen} onOpenChange={setInstallmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {installmentDialogType === "reverse" || (installmentDialogType === "delete" && hasPaid)
                ? "Estornar Compra Parcelada"
                : "Excluir Parcelas"}
            </DialogTitle>
            <DialogDescription>
              {isLoadingGroupInfo ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando informações das parcelas...
                </span>
              ) : installmentGroupInfo ? (
                <>
                  {installmentDialogType === "delete" && allPending && (
                    <>
                      {installmentGroupInfo.pendingCount > 1 ? (
                        <>Esta compra possui {installmentGroupInfo.pendingCount} parcelas pendentes.
                        Deseja excluir apenas esta parcela ou todas?</>
                      ) : (
                        <>Tem certeza que deseja excluir esta parcela?</>
                      )}
                    </>
                  )}
                  {/* Delete with some/all paid → offer reverse */}
                  {installmentDialogType === "delete" && hasPaid && (
                    <>
                      Esta compra parcelada possui {installmentGroupInfo.paidCount} parcela(s) já paga(s) na fatura.
                      Não é possível excluir diretamente. Deseja estornar as parcelas que foram pagas?
                      {installmentGroupInfo.pendingCount > 0 && (
                        <> {installmentGroupInfo.pendingCount} parcela(s) pendente(s) serão excluídas.</>)}
                    </>
                  )}
                  {/* Reverse */}
                  {installmentDialogType === "reverse" && (
                    <>
                      Estornar as compras parceladas que foram pagas ({installmentGroupInfo.paidCount} parcela(s)).
                      O crédito correspondente será gerado no cartão.
                      {installmentGroupInfo.pendingCount > 0 && (
                        <> {installmentGroupInfo.pendingCount} parcela(s) pendente(s) serão excluídas.</>)}
                      {" "}Esta ação não pode ser desfeita.
                    </>
                  )}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {!isLoadingGroupInfo && installmentGroupInfo && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setInstallmentDialogOpen(false)}>
                Cancelar
              </Button>
              {/* Delete all pending: show options */}
              {installmentDialogType === "delete" && allPending && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteMutation.mutate(t.id!);
                      setInstallmentDialogOpen(false);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Excluir Esta Parcela
                  </Button>
                  {installmentGroupInfo.pendingCount > 1 && (
                    <Button
                      variant="destructive"
                      onClick={handleInstallmentDelete}
                      disabled={deleteInstallmentMutation.isPending}
                    >
                      {deleteInstallmentMutation.isPending ? "Excluindo..." : "Excluir Todas"}
                    </Button>
                  )}
                </>
              )}
              {/* Delete with paid → offer reverse */}
              {installmentDialogType === "delete" && hasPaid && (
                <Button
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                  onClick={handleInstallmentReverse}
                  disabled={reverseInstallmentMutation.isPending}
                >
                  {reverseInstallmentMutation.isPending ? "Estornando..." : "Estornar Parcelas Pagas"}
                </Button>
              )}
              {/* Reverse flow */}
              {installmentDialogType === "reverse" && (
                <Button
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                  onClick={handleInstallmentReverse}
                  disabled={reverseInstallmentMutation.isPending}
                >
                  {reverseInstallmentMutation.isPending ? "Estornando..." : "Confirmar Estorno"}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
