"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Goal } from "@/types/goal.types";
import { AlertTriangle, Trash2 } from "lucide-react";

type Strategy = "hard" | "soft";

interface GoalDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  balance: number;           // Current goal balance (calculated)
  hasTransactions: boolean;  // Whether any goal_transfer/goal_withdraw exists
  currentMonthYear: string;  // "YYYY-MM" for the auto-withdraw target
  onConfirm: (strategy: Strategy, createWithdraw: boolean) => Promise<void>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function GoalDeleteDialog({
  open,
  onOpenChange,
  goal,
  balance,
  hasTransactions,
  currentMonthYear,
  onConfirm,
}: GoalDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chosen, setChosen] = useState<Strategy | null>(null);

  const handleConfirm = async (strategy: Strategy) => {
    setChosen(strategy);
    setIsSubmitting(true);
    try {
      const createWithdraw = strategy === "soft" && balance > 0;
      await onConfirm(strategy, createWithdraw);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
      setChosen(null);
    }
  };

  // Case A: no transactions — simple confirmation
  if (!hasTransactions) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir o objetivo <strong>"{goal.name}"</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleConfirm("hard")}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Case B: has transactions — show choice
  const [yy, mm] = currentMonthYear.split("-").map(Number);
  const currentMonthLabel = new Date(yy, mm - 1, 1).toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Excluir Objetivo com Movimentações
          </AlertDialogTitle>
          <div className="space-y-3 text-sm text-muted-foreground mt-2">
            <AlertDialogDescription>
              <span>
                O objetivo <strong className="text-foreground">"{goal.name}"</strong> possui
                movimentações registradas
                {balance > 0 && (
                  <> e um saldo de <strong className="text-foreground">{formatCurrency(balance)}</strong></>
                )}
                . Escolha como deseja proceder:
              </span>
            </AlertDialogDescription>

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <Trash2 className="h-4 w-4 text-destructive" />
                Excluir e ajustar os meses
              </div>
              <div className="text-xs">
                Todas as transferências e saques serão deletados. Os saldos dos meses
                históricos serão recalculados. Esta ação não pode ser desfeita.
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="font-medium text-foreground">Manter histórico dos meses</div>
              <div className="text-xs">
                O objetivo será inativado e as movimentações serão preservadas.
                {balance > 0 && (
                  <> O saldo de <strong>{formatCurrency(balance)}</strong> será automaticamente
                  sacado para <strong>{currentMonthLabel}</strong>.</>
                )}
                {balance === 0 && " Nenhum saque será criado (saldo zero)."}
              </div>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={() => handleConfirm("soft")}
              disabled={isSubmitting}
            >
              {isSubmitting && chosen === "soft" ? "Processando..." : "Manter histórico"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleConfirm("hard")}
              disabled={isSubmitting}
            >
              {isSubmitting && chosen === "hard" ? "Excluindo..." : "Excluir e ajustar"}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
