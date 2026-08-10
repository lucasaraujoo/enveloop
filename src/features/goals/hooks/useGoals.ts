"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { goalService } from "@/services/goal.service";
import { transactionService } from "@/services/transaction.service";
import { Goal } from "@/types/goal.types";
import { Transaction } from "@/types/transaction.types";
import { getDocs, query, where } from "firebase/firestore";
import { userCol } from "@/lib/firestore";
import { toast } from "sonner";

// ─── Fetch all goals + all their transactions in one round trip ───────────────

async function fetchGoalsWithTransactions(userId: string) {
  // Executa as duas queries em paralelo
  const txCol = userCol<Transaction>(userId, "transactions");
  const txQuery = query(txCol, where("type", "in", ["goal_transfer", "goal_withdraw"]));

  const [allGoals, txSnap] = await Promise.all([
    goalService.getGoals(userId),
    getDocs(txQuery)
  ]);

  // Filtramos os objetivos ativos (já que removemos o where("active") do service)
  const activeGoals = allGoals.filter((g) => g.active !== false);
  const inactiveGoals = allGoals.filter((g) => g.active === false);

  const transactions: Transaction[] = txSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return { goals: allGoals, activeGoals, inactiveGoals, transactions };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ["goals", user?.uid],
    queryFn: () => fetchGoalsWithTransactions(user!.uid),
    enabled: !!user,
  });

  const goals = goalsQuery.data?.goals ?? [];
  const activeGoals = goalsQuery.data?.activeGoals ?? [];
  const inactiveGoals = goalsQuery.data?.inactiveGoals ?? [];
  const allGoalTransactions = goalsQuery.data?.transactions ?? [];

  // Pre-compute balance for each goal
  const balanceMap: Record<string, number> = {};
  goals.forEach((g) => {
    balanceMap[g.id!] = goalService.calcBalance(g.id!, allGoalTransactions);
  });

  const totalInGoals = Object.values(balanceMap).reduce((s, v) => s + v, 0);

  // ── Create ──
  const createMutation = useMutation({
    mutationFn: (data: Pick<Goal, "name" | "targetAmount">) =>
      goalService.createGoal(user!.uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Objetivo criado com sucesso");
    },
    onError: () => toast.error("Erro ao criar objetivo"),
  });

  // ── Update ──
  const updateMutation = useMutation({
    mutationFn: ({
      goalId,
      data,
    }: {
      goalId: string;
      data: Partial<Pick<Goal, "name" | "targetAmount" | "active">>;
    }) => goalService.updateGoal(user!.uid, goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Objetivo atualizado");
    },
    onError: () => toast.error("Erro ao atualizar objetivo"),
  });

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: (params: {
      goalId: string;
      strategy: "hard" | "soft";
      options?: {
        createWithdraw?: boolean;
        withdrawAmount?: number;
        withdrawMonthYear?: string;
        withdrawDate?: Date;
      };
    }) =>
      goalService.deleteGoal(user!.uid, params.goalId, params.strategy, params.options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Objetivo excluído");
    },
    onError: () => toast.error("Erro ao excluir objetivo"),
  });

  // ── Goal Transfer ──
  const goalTransferMutation = useMutation({
    mutationFn: (params: Parameters<typeof transactionService.createGoalTransfer>[1]) =>
      transactionService.createGoalTransfer(user!.uid, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transferência para objetivo realizada");
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "Erro ao transferir para objetivo"),
  });

  // ── Goal Withdraw ──
  const goalWithdrawMutation = useMutation({
    mutationFn: (params: Parameters<typeof transactionService.createGoalWithdraw>[1]) =>
      transactionService.createGoalWithdraw(user!.uid, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Saque do objetivo realizado");
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "Erro ao sacar do objetivo"),
  });

  // ── Delete single goal transaction ──
  const deleteGoalTransactionMutation = useMutation({
    mutationFn: (transactionId: string) =>
      transactionService.deleteTransaction(user!.uid, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Lançamento removido");
    },
    onError: () => toast.error("Erro ao remover lançamento"),
  });

  return {
    goalsQuery,
    goals,
    activeGoals,
    inactiveGoals,
    balanceMap,
    totalInGoals,
    allGoalTransactions,
    createMutation,
    updateMutation,
    deleteMutation,
    goalTransferMutation,
    goalWithdrawMutation,
    deleteGoalTransactionMutation,
  };
}
