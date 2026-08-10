"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { MonthTransferModal } from "@/features/transactions/components/MonthTransferModal";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { Plus, ArrowRightLeft, ChevronLeft, ChevronRight } from "lucide-react";

export default function TransactionsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthYearStr = `${year}-${month.toString().padStart(2, "0")}`;

  const { createMutation, installmentMutation } = useTransactions([monthYearStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const monthLabel = currentDate.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas transações e transferências
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsTransferModalOpen(true)} className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Transferência entre Meses</span>
          </Button>
          <Button onClick={() => setIsTransactionModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-2">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium capitalize">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Transactions List */}
      <TransactionList monthYears={[monthYearStr]} />

      {/* Transaction Form Modal */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
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
            }} 
            isSubmitting={createMutation.isPending || installmentMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Month Transfer Modal */}
      <MonthTransferModal 
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        targetMonth={month}
        targetYear={year}
      />
    </div>
  );
}
