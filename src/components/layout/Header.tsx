"use client";

import { LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MobileSidebar } from "./MobileSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { useState } from "react";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";

export function Header() {
  const router = useRouter();
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  
  // Use current month/year for quick add
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthYearStr = `${year}-${month.toString().padStart(2, "0")}`;

  const { createMutation, installmentMutation } = useTransactions([monthYearStr]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push("/login");
    } catch {
      toast.error("Erro ao sair da conta");
    }
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="md:hidden">
            <MobileSidebar />
          </div>
          <span className="text-lg font-bold text-primary">EnveLoop</span>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2"
            onClick={() => setIsTransactionModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Lançamento Rápido</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamento Rápido</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            defaultReferenceMonthYear={monthYearStr}
            onSubmit={async (data) => {
              const { installments, ...rest } = data;
              if (data.type === "card_purchase" && installments > 1) {
                await installmentMutation.mutateAsync({
                  data: {
                    ...rest,
                    paymentMethod: "credit_card" as const,
                    status: "pending" as const,
                  },
                  installments,
                });
              } else {
                await createMutation.mutateAsync({
                  ...rest,
                  referenceMonthYear: data.referenceMonthYear,
                  ...(data.invoiceMonthYear ? { invoiceMonthYear: data.invoiceMonthYear } : {}),
                  status: data.type === "card_purchase" ? "pending" : "paid",
                });
              }
              setIsTransactionModalOpen(false);
              toast.success("Lançamento adicionado com sucesso!");
            }} 
            isSubmitting={createMutation.isPending || installmentMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
