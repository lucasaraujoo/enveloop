import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountService } from "@/services/account.service";
import { useAuth } from "@/providers/AuthProvider";
import { Account } from "@/types/account.types";

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ["accounts", user?.uid],
    queryFn: () => accountService.getAccounts(user!.uid),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Account, "id" | "createdAt" | "updatedAt">) =>
      accountService.createAccount(user!.uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Account> & { id: string, previousInitialBalance?: number }) =>
      accountService.updateAccount(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => accountService.restoreAccount(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({ fromAccountId, toAccountId, amount }: { fromAccountId: string; toAccountId: string; amount: number }) =>
      accountService.transferBetweenAccounts(user!.uid, fromAccountId, toAccountId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const activeAccounts = accountsQuery.data?.filter((a) => a.active) || [];
  const inactiveAccounts = accountsQuery.data?.filter((a) => !a.active) || [];

  return {
    accountsQuery,
    activeAccounts,
    inactiveAccounts,
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
    transferMutation,
  };
}
