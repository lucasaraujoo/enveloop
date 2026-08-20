"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { Account } from "@/types/account.types";
import { toast } from "sonner";
import { useState } from "react";

const accountSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  initialBalance: z.number({ message: "Digite um valor numérico" }),
  color: z.string().optional(),
});

type AccountFormProps = {
  initialData?: Account;
  inactiveAccounts?: Account[];
  onSuccess: () => void;
};

export function AccountForm({ initialData, inactiveAccounts = [], onSuccess }: AccountFormProps) {
  const { createMutation, updateMutation, restoreMutation } = useAccounts();
  const [duplicateAccount, setDuplicateAccount] = useState<Account | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof accountSchema> | null>(null);

  const form = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name || "",
      initialBalance: initialData?.initialBalance || 0,
      color: initialData?.color || "#3b82f6",
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending || restoreMutation.isPending;

  async function onSubmit(values: z.infer<typeof accountSchema>) {
    if (initialData?.id) {
      // Editing — pass previousInitialBalance so service can apply delta to balance
      try {
        await updateMutation.mutateAsync({
          id: initialData.id,
          ...values,
          previousInitialBalance: initialData.initialBalance,
        });
        toast.success("Conta atualizada com sucesso");
        onSuccess();
      } catch (error) {
        toast.error("Ocorreu um erro ao salvar a conta");
      }
      return;
    }

    // Creating - check for duplicates in inactive accounts
    const duplicate = inactiveAccounts.find(
      (a) => a.name.toLowerCase().trim() === values.name.toLowerCase().trim()
    );

    if (duplicate) {
      setDuplicateAccount(duplicate);
      setPendingValues(values);
      return; // Wait for user confirmation
    }

    // Normal creation
    try {
      await createMutation.mutateAsync({
        ...values,
        active: true,
        balance: values.initialBalance,
      });
      toast.success("Conta criada com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Ocorreu um erro ao criar a conta");
    }
  }

  const handleRestoreConfirm = async () => {
    if (!duplicateAccount || !pendingValues) return;
    
    try {
      // First update the inactive account with the new values, then restore it
      await updateMutation.mutateAsync({
        id: duplicateAccount.id!,
        ...pendingValues,
      });
      await restoreMutation.mutateAsync(duplicateAccount.id!);
      
      toast.success("Conta restaurada e atualizada com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao restaurar a conta");
    } finally {
      setDuplicateAccount(null);
      setPendingValues(null);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Conta</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Nubank" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="initialBalance"
            render={({ field }) => {
              const displayValue = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(field.value || 0);

              return (
                <FormItem>
                  <FormLabel>Saldo Inicial (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={displayValue}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        const numericValue = Number(digits) / 100;
                        field.onChange(numericValue);
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input type="color" className="w-16 p-1 h-10 cursor-pointer" {...field} />
                    <Input type="text" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={!!duplicateAccount} onOpenChange={(open) => !open && setDuplicateAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conta Inativa Encontrada</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma conta inativa com o nome "{duplicateAccount?.name}". 
              Deseja restaurá-la e atualizar suas informações com os dados que você acabou de preencher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateAccount(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
