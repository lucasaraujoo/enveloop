"use client";

import { useState } from "react";
import { Goal } from "@/types/goal.types";
import { Transaction } from "@/types/transaction.types";
import {
  Target,
  ChevronDown,
  Pencil,
  TrendingDown,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoalCardProps {
  goal: Goal;
  balance: number;
  transactions: Transaction[]; // All transactions for this goal
  onEdit: () => void;
  onWithdraw: () => void;
  onDelete: () => void;
  onDeleteTransaction: (txId: string) => void;
  onRestore?: () => void;
  isDeletingTx?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: any): string {
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function GoalCard({
  goal,
  balance,
  transactions,
  onEdit,
  onWithdraw,
  onDelete,
  onDeleteTransaction,
  onRestore,
  isDeletingTx = false,
}: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const progress =
    goal.targetAmount > 0
      ? Math.min((balance / goal.targetAmount) * 100, 100)
      : 0;

  const isComplete = progress >= 100;

  const sortedTransactions = [...transactions].sort((a, b) => {
    const da = (a.date as any)?.seconds ?? 0;
    const db = (b.date as any)?.seconds ?? 0;
    return db - da;
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* ── Header ── */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Icon + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
              <Target className="h-5 w-5 text-violet-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{goal.name}</h3>
              <p className="text-xs text-muted-foreground">
                Meta: {formatCurrency(goal.targetAmount)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {goal.active !== false ? (
              <>
                <button
                  onClick={onEdit}
                  title="Editar objetivo"
                  className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={onWithdraw}
                  title="Sacar do objetivo"
                  disabled={balance <= 0}
                  className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TrendingDown className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  title="Excluir objetivo"
                  className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              onRestore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRestore}
                  className="h-8 text-xs px-3 font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                >
                  Reativar
                </Button>
              )
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="mb-3">
          <div className="flex items-end justify-between mb-1.5">
            <span
              className={`text-2xl font-bold tabular-nums ${isComplete ? "text-emerald-500" : "text-foreground"
                }`}
            >
              {formatCurrency(balance)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : "bg-violet-500"
                }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Footer: expand button ── */}
      <div className="border-t border-border/50 px-5 py-2 flex items-center justify-between bg-muted/20">
        <span className="text-xs text-muted-foreground">
          {transactions.length}{" "}
          {transactions.length === 1 ? "movimentação" : "movimentações"}
        </span>

        {transactions.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Extrato
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                }`}
            />
          </button>
        )}
      </div>

      {/* ── Expanded transactions ── */}
      {isExpanded && (
        <div className="divide-y divide-border/30">
          {sortedTransactions.map((tx) => {
            const isIn = tx.type === "goal_transfer";
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/20 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isIn ? "bg-red-500/10" : "bg-emerald-500/10"
                    }`}
                >
                  {isIn ? (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>

                {/* Description + date */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{tx.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(tx.date)} · {tx.referenceMonthYear}
                  </span>
                </div>

                {/* Amount */}
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${isIn ? "text-red-500" : "text-emerald-500"
                    }`}
                >
                  {isIn ? "-" : "+"} {formatCurrency(tx.amount)}
                </span>

                {/* Delete button */}
                {goal.active !== false && (
                  <button
                    onClick={() => onDeleteTransaction(tx.id!)}
                    disabled={isDeletingTx}
                    title="Remover lançamento"
                    className="inline-flex items-center justify-center rounded-md h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {isDeletingTx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
