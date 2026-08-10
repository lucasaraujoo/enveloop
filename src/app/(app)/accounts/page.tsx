"use client";

import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash, ArchiveRestore, Filter, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountForm } from "@/features/accounts/components/AccountForm";
import { Account } from "@/types/account.types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function AccountsPage() {
  const {
    accountsQuery,
    activeAccounts,
    inactiveAccounts,
    deleteMutation,
    restoreMutation,
    transferMutation,
  } = useAccounts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Transfer dialog state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("R$ 0,00");

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    try {
      await deleteMutation.mutateAsync(accountToDelete.id!);
      toast.success("Conta excluída com sucesso");
    } catch (e) {
      toast.error("Erro ao excluir conta");
    } finally {
      setAccountToDelete(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success("Conta restaurada com sucesso");
    } catch (e) {
      toast.error("Erro ao restaurar conta");
    }
  };

  const openTransferDialog = () => {
    setTransferFrom("");
    setTransferTo("");
    setTransferAmount("R$ 0,00");
    setIsTransferOpen(true);
  };

  const parseAmountValue = (formatted: string): number => {
    const digits = formatted.replace(/\D/g, "");
    return Number(digits) / 100;
  };

  const handleTransferAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const numeric = Number(digits) / 100;
    setTransferAmount(
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric)
    );
  };

  const handleTransferSubmit = async () => {
    const amount = parseAmountValue(transferAmount);

    if (!transferFrom) {
      toast.error("Selecione a conta de origem.");
      return;
    }
    if (!transferTo) {
      toast.error("Selecione a conta de destino.");
      return;
    }
    if (transferFrom === transferTo) {
      toast.error("A conta de origem e destino devem ser diferentes.");
      return;
    }
    if (amount <= 0) {
      toast.error("O valor da transferência deve ser maior que zero.");
      return;
    }

    const fromAccount = activeAccounts.find((a) => a.id === transferFrom);
    const fromBalance = fromAccount?.balance ?? fromAccount?.initialBalance ?? 0;
    if (amount > fromBalance) {
      toast.error(
        `Saldo insuficiente. A conta de origem possui ${formatCurrency(fromBalance)}.`
      );
      return;
    }

    try {
      await transferMutation.mutateAsync({ fromAccountId: transferFrom, toAccountId: transferTo, amount });
      toast.success(`Transferência de ${formatCurrency(amount)} realizada com sucesso!`);
      setIsTransferOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao realizar transferência.");
    }
  };

  const displayAccounts = showInactive ? inactiveAccounts : activeAccounts;

  const totalBalance = activeAccounts.reduce(
    (sum, a) => sum + (a.balance ?? a.initialBalance ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Contas Bancárias</h1>
          {showInactive && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              Exibindo Inativos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Filter className="h-4 w-4" />
              Filtros
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
          {!showInactive && activeAccounts.length >= 2 && (
            <Button variant="outline" onClick={openTransferDialog}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transferir
            </Button>
          )}
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* Saldo Geral */}
      {!showInactive && activeAccounts.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm font-medium text-muted-foreground">Saldo Geral (todas as contas)</p>
            <p className={`text-2xl font-bold ${totalBalance < 0 ? "text-destructive" : "text-emerald-500"}`}>
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accountsQuery.isLoading && (
          <div className="col-span-full flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!accountsQuery.isLoading && displayAccounts.map((account) => (
          <Card key={account.id} className={showInactive ? "opacity-70 grayscale" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {account.name}
              </CardTitle>
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: account.color || "#ccc" }}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(account.balance ?? account.initialBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo atual
              </p>
              <div className="mt-4 flex gap-2">
                {!showInactive ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(account)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setAccountToDelete(account)}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleRestore(account.id!)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!accountsQuery.isLoading && displayAccounts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            {showInactive ? "Nenhuma conta inativa." : "Nenhuma conta cadastrada ou ativa."}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Editar Conta" : "Nova Conta"}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            initialData={editingAccount || undefined}
            inactiveAccounts={inactiveAccounts}
            onSuccess={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transferência entre Contas</DialogTitle>
            <DialogDescription>
              O valor será abatido da conta de origem e creditado na conta de destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Conta de Origem</Label>
              <Select value={transferFrom} onValueChange={(val) => { setTransferFrom(val ?? ""); if (val === transferTo) setTransferTo(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de origem">
                    {transferFrom
                      ? (() => {
                          const acc = activeAccounts.find((a) => a.id === transferFrom);
                          return acc ? `${acc.name} — ${formatCurrency(acc.balance ?? acc.initialBalance)}` : undefined;
                        })()
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id!}>
                      {acc.name} — {formatCurrency(acc.balance ?? acc.initialBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Conta de Destino</Label>
              <Select value={transferTo} onValueChange={(val) => setTransferTo(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de destino">
                    {activeAccounts.find((a) => a.id === transferTo)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts
                    .filter((a) => a.id !== transferFrom)
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id!}>
                        {acc.name} — {formatCurrency(acc.balance ?? acc.initialBalance)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Valor</Label>
              <Input
                type="text"
                value={transferAmount}
                onChange={handleTransferAmountChange}
                onFocus={(e) => e.target.select()}
              />
              {transferFrom && (() => {
                const acc = activeAccounts.find((a) => a.id === transferFrom);
                const bal = acc?.balance ?? acc?.initialBalance ?? 0;
                return (
                  <p className="text-xs text-muted-foreground">
                    Saldo disponível: {formatCurrency(bal)}
                  </p>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransferSubmit} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferindo...</>
              ) : (
                <><ArrowRightLeft className="mr-2 h-4 w-4" /> Confirmar Transferência</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta &ldquo;{accountToDelete?.name}&rdquo;?
              <br /><br />
              <strong>Atenção:</strong> Ao excluir esta conta, seu saldo não será mais contabilizado na Dashboard geral. Os lançamentos vinculados a ela ainda serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
