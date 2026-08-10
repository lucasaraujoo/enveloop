import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "@/services/transaction.service";
import { useAuth } from "@/providers/AuthProvider";

export function useTransactions(monthYears: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["transactions", monthYears],
    queryFn: () => {
      if (!user) throw new Error("No user");
      return transactionService.getTransactionsByMonths(user.uid, monthYears);
    },
    enabled: !!user && monthYears.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!user) throw new Error("No user");
      return transactionService.createTransaction(user.uid, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (transactionId: string) => {
      if (!user) throw new Error("No user");
      return transactionService.deleteTransaction(user.uid, transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: (transactionId: string) => {
      if (!user) throw new Error("No user");
      return transactionService.reverseTransaction(user.uid, transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  const installmentMutation = useMutation({
    mutationFn: (params: { data: any; installments: number }) => {
      if (!user) throw new Error("No user");
      return transactionService.createInstallmentPurchase(
        user.uid,
        params.data,
        params.installments
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  const reverseInstallmentMutation = useMutation({
    mutationFn: (installmentId: string) => {
      if (!user) throw new Error("No user");
      return transactionService.reverseInstallmentGroup(
        user.uid,
        installmentId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  const deleteInstallmentMutation = useMutation({
    mutationFn: (installmentId: string) => {
      if (!user) throw new Error("No user");
      return transactionService.deleteInstallmentGroup(
        user.uid,
        installmentId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });

  return {
    ...query,
    createMutation,
    deleteMutation,
    reverseMutation,
    installmentMutation,
    reverseInstallmentMutation,
    deleteInstallmentMutation,
  };
}
