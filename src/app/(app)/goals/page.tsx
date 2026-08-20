"use client";

import { useState, useMemo } from "react";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useEnvelopes } from "@/features/envelopes/hooks/useEnvelopes";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { GoalCard } from "@/features/goals/components/GoalCard";
import { GoalForm } from "@/features/goals/components/GoalForm";
import { GoalTransferModal } from "@/features/goals/components/GoalTransferModal";
import { GoalDeleteDialog } from "@/features/goals/components/GoalDeleteDialog";
import { Goal } from "@/types/goal.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Target,
  Loader2,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function GoalsPage() {
  const {
    goals,
    activeGoals,
    inactiveGoals,
    goalsQuery,
    allGoalTransactions,
    balanceMap,
    totalInGoals,
    createMutation,
    updateMutation,
    deleteMutation,
    goalTransferMutation,
    goalWithdrawMutation,
    deleteGoalTransactionMutation,
  } = useGoals();

  const { activeEnvelopes } = useEnvelopes();
  const { accountsQuery } = useAccounts();

  const activeAccounts = accountsQuery.data?.filter((a) => a.active) ?? [];
  const totalAccountBalance = activeAccounts.reduce(
    (sum, a) => sum + (a.balance ?? a.initialBalance ?? 0),
    0
  );
  const isOverAllocated = totalInGoals > totalAccountBalance;

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [transferGoal, setTransferGoal] = useState<(Goal & { balance: number }) | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<(Goal & { balance: number }) | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);

  const currentMonthYear = getCurrentMonthYear();

  // Goals with balance for the modal
  const goalsWithBalance = goals.map((g: Goal) => ({
    ...g,
    balance: balanceMap[g.id!] ?? 0,
  }));

  const displayGoals = showInactive ? inactiveGoals : activeGoals;

  // Filtered goals
  const filteredGoals = useMemo(() => {
    if (!searchTerm.trim()) return displayGoals;
    return displayGoals.filter((g: Goal) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [displayGoals, searchTerm]);



  // Handlers
  const handleCreate = async (data: Pick<Goal, "name" | "targetAmount">) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: Partial<Goal>) => {
    if (!editingGoal?.id) return;
    await updateMutation.mutateAsync({ goalId: editingGoal.id, data });
  };

  const handleRestore = async (goalId: string) => {
    await updateMutation.mutateAsync({ goalId, data: { active: true } });
  };

  const handleDelete = async (strategy: "hard" | "soft", createWithdraw: boolean) => {
    if (!deleteGoal?.id) return;
    const balance = balanceMap[deleteGoal.id] ?? 0;
    await deleteMutation.mutateAsync({
      goalId: deleteGoal.id,
      strategy,
      options: createWithdraw
        ? {
            createWithdraw: true,
            withdrawAmount: balance,
            withdrawMonthYear: currentMonthYear,
            withdrawDate: new Date(),
          }
        : undefined,
    });
    setDeleteGoal(null);
  };

  const deleteGoalBalance = deleteGoal ? (balanceMap[deleteGoal.id!] ?? 0) : 0;
  const deleteGoalTransactions = deleteGoal
    ? allGoalTransactions.filter((t) => t.goalId === deleteGoal.id)
    : [];

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Objetivos</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">
              Separe recursos para suas metas financeiras.
            </p>
            {showInactive && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                Exibindo Inativos
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowInactive(false)} className={!showInactive ? "bg-muted" : ""}>
                Mostrar Ativos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowInactive(true)} className={showInactive ? "bg-muted" : ""}>
                Mostrar Excluídos/Inativos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { setEditingGoal(null); setIsFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </div>
      </div>

      {/* ── Total indicator ── */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 shrink-0">
          <Target className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total em Objetivos
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-bold tabular-nums">{formatCurrency(totalInGoals)}</span>
            {isOverAllocated && (
              <div
                className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
                title={`O total em objetivos (${formatCurrency(totalInGoals)}) excede o saldo disponível em contas (${formatCurrency(totalAccountBalance)}). Verifique suas finanças.`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Acima do saldo em contas</span>
              </div>
            )}
          </div>
          {isOverAllocated && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Saldo em contas: {formatCurrency(totalAccountBalance)}
            </p>
          )}
        </div>
      </div>

      {/* ── Search filter ── */}
      {displayGoals.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar objetivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* ── Goals grid ── */}
      {goalsQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 p-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">
              {showInactive ? "Nenhum objetivo inativo/excluído" : "Nenhum objetivo cadastrado"}
            </p>
            {!showInactive && (
              <p className="text-sm text-muted-foreground/70 mt-0.5">
                Crie seu primeiro objetivo para começar a separar recursos.
              </p>
            )}
          </div>
          {!showInactive && (
            <Button
              variant="outline"
              className="mt-2 gap-2"
              onClick={() => { setEditingGoal(null); setIsFormOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Criar Objetivo
            </Button>
          )}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground border rounded-xl bg-card/50">
          Nenhum objetivo encontrado para "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => {
            const balance = balanceMap[goal.id!] ?? 0;
            const txs = allGoalTransactions.filter((t) => t.goalId === goal.id);
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                balance={balance}
                transactions={txs}
                onTransfer={() => setTransferGoal({ ...goal, balance })}
                onEdit={() => {
                  setEditingGoal(goal);
                  setIsFormOpen(true);
                }}
                onWithdraw={() =>
                  setWithdrawGoal({ ...goal, balance })
                }
                onDelete={() => setDeleteGoal(goal)}
                onDeleteTransaction={(txId) =>
                  deleteGoalTransactionMutation.mutate(txId)
                }
                onRestore={() => handleRestore(goal.id!)}
                isDeletingTx={deleteGoalTransactionMutation.isPending}
              />
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      <GoalForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingGoal ? "Editar Objetivo" : "Novo Objetivo"}
        initialData={editingGoal ?? undefined}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
      />

      {transferGoal && (
        <GoalTransferModal
          open={!!transferGoal}
          onOpenChange={(open) => !open && setTransferGoal(null)}
          mode="transfer"
          lockedGoal={transferGoal}
          maxAmount={totalAccountBalance}
          defaultMonthYear={currentMonthYear}
          goals={goalsWithBalance}
          envelopes={activeEnvelopes}
          onTransfer={async (params) => {
            await goalTransferMutation.mutateAsync(params);
            setTransferGoal(null);
          }}
          onWithdraw={async () => {}}
        />
      )}

      {withdrawGoal && (
        <GoalTransferModal
          open={!!withdrawGoal}
          onOpenChange={(open) => !open && setWithdrawGoal(null)}
          mode="withdraw"
          lockedGoal={withdrawGoal}
          defaultMonthYear={currentMonthYear}
          onTransfer={async () => {}}
          onWithdraw={async (params) => {
            await goalWithdrawMutation.mutateAsync(params);
            setWithdrawGoal(null);
          }}
        />
      )}

      {deleteGoal && (
        <GoalDeleteDialog
          open={!!deleteGoal}
          onOpenChange={(open) => !open && setDeleteGoal(null)}
          goal={deleteGoal}
          balance={deleteGoalBalance}
          hasTransactions={deleteGoalTransactions.length > 0}
          currentMonthYear={currentMonthYear}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
