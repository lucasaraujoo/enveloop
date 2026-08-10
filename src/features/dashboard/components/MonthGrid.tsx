"use client";

import { useState } from "react";
import { DashboardData, MonthSummaryData } from "@/services/dashboard.service";
import { EnvelopeRow } from "./EnvelopeRow";
import { MonthTransferModal } from "@/features/transactions/components/MonthTransferModal";
import { GoalTransferModal } from "@/features/goals/components/GoalTransferModal";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useEnvelopes } from "@/features/envelopes/hooks/useEnvelopes";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowDownToLine, ArrowUpFromLine, Minus, ArrowRightLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthGridProps {
  data: DashboardData;
  isMobile?: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
  onUpdateLimit: (month: number, year: number, envelopeId: string, limit: number) => Promise<void>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const COL_DATA_W = "minmax(140px, 1fr)";

export function gridCols(count: number, isMobile?: boolean) {
  const labelWidth = isMobile ? "160px" : "200px";
  return `${labelWidth} repeat(${count}, ${COL_DATA_W})`;
}

export function MonthGrid({
  data,
  isMobile,
  onNavigatePrev,
  onNavigateNext,
  onGoToToday,
  onUpdateLimit,
}: MonthGridProps) {
  const { months, envelopes } = data;
  const [transferMonth, setTransferMonth] = useState<MonthSummaryData | null>(null);
  const [goalTransferMonth, setGoalTransferMonth] = useState<MonthSummaryData | null>(null);

  const { goals, balanceMap, goalTransferMutation, goalWithdrawMutation } = useGoals();
  const { activeEnvelopes } = useEnvelopes();

  const goalsWithBalance = goals.map((g) => ({ ...g, balance: balanceMap[g.id!] ?? 0 }));
  const activeGoalEnvelopes = activeEnvelopes;

  return (
    <div className="space-y-4">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onNavigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNavigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onGoToToday} className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="font-medium">{months[0]?.label}</span>
          <span>→</span>
          <span className="font-medium">{months[months.length - 1]?.label}</span>
        </div>
      </div>

      {/* Single unified grid container — envelopes + summary share the same column widths */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-x-auto scrollbar-hover-auto">
        <div className="min-w-max">

          {/* ── Column headers ── */}
          <div
            className="grid border-b border-border/50 bg-muted/10"
            style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
          >
            <div className="max-md:relative md:sticky md:left-0 bg-card z-10 px-2 sm:px-4 py-3 border-r border-border/50 md:border-r-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Envelope
              </span>
            </div>
            {months.map((m) => {
              const isCurrentMonth =
                m.month === new Date().getMonth() + 1 &&
                m.year === new Date().getFullYear();
              return (
                <div
                  key={m.monthYear}
                  className={`px-1 py-3 text-center ${isCurrentMonth ? "bg-primary/5" : ""}`}
                >
                  <p className={`text-sm font-semibold ${isCurrentMonth ? "text-primary" : "text-foreground"}`}>
                    {m.label}
                  </p>
                  {isCurrentMonth && (
                    <span className="inline-block mt-0.5 h-1 w-1 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Envelope rows ── */}
          {envelopes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground"
              style={{ gridColumn: `1 / -1` }}
            >
              <p className="text-sm">Nenhum envelope padrão cadastrado.</p>
              <p className="text-xs">Cadastre envelopes para visualizar o planejamento.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {envelopes.map((envelope) => (
                <EnvelopeRow
                  key={envelope.id}
                  envelope={envelope}
                  months={months}
                  isMobile={isMobile}
                  onUpdateLimit={onUpdateLimit}
                />
              ))}
            </div>
          )}

          {/* ── Summary section — same grid widths ── */}
          <div className="border-t border-border/50 bg-muted/10 mt-2">
            {/* Summary header */}
            <div
              className="grid border-b border-border/30 pb-2 pt-3"
              style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
            >
              <div className="max-md:relative md:sticky md:left-0 bg-card z-10 px-2 sm:px-4 border-r border-border/50 md:border-r-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resumo Mensal
                </span>
              </div>
              {months.map((m) => (
                <div key={m.monthYear} className="px-1 text-center">
                  <span className="text-xs font-semibold text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Total Planejado row */}
            <div
              className="grid py-2 border-b border-border/20"
              style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
            >
              <div className="max-md:relative md:sticky md:left-0 bg-card z-10 flex items-center px-2 sm:px-4">
                <span className="text-xs font-medium text-foreground">Total Planejado</span>
              </div>
              {months.map((m) => {
                const isOver = (m.totalIncome > 0 || m.totalExpenses > 0) && m.totalPlanned > m.totalIncome;
                return (
                  <div key={m.monthYear} className="px-1 text-center">
                    <span className={`block text-sm font-semibold tabular-nums ${isOver ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {formatCurrency(m.totalPlanned)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Receitas row */}
            <div
              className="grid py-2 border-b border-border/20"
              style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
            >
              <div className="max-md:relative md:sticky md:left-0 bg-card z-10 flex items-center px-2 sm:px-4">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Receitas</span>
              </div>
              {months.map((m) => (
                <div key={m.monthYear} className="px-1 text-center">
                  <span className="block text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(m.totalIncome)}
                  </span>
                </div>
              ))}
            </div>

            {/* Saídas row */}
            <div
              className="grid py-2 border-b border-border/20"
              style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
            >
              <div className="max-md:relative md:sticky md:left-0 bg-card z-10 flex items-center px-2 sm:px-4">
                <span className="text-xs font-medium text-foreground">Saídas</span>
              </div>
              {months.map((m) => {
                const isOver = m.totalExpenses > m.totalIncome;
                return (
                  <div key={m.monthYear} className="px-1 text-center">
                    <span className={`block text-sm font-semibold tabular-nums ${isOver ? 'text-destructive' : 'text-orange-600 dark:text-orange-500'}`}>
                      {formatCurrency(m.totalExpenses)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Saldo row */}
            <div
              className="grid py-2 border-b border-border/20"
              style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
            >
              <div className="max-md:relative md:sticky md:left-0 bg-card z-10 flex items-center px-2 sm:px-4">
                <span className="text-xs font-medium text-foreground">Saldo</span>
              </div>
              {months.map((m) => {
                const isPositive = m.saldo >= 0;
                return (
                  <div key={m.monthYear} className="px-1 text-center">
                    <span className={`block text-sm font-semibold tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {formatCurrency(m.saldo)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Status + Transfer button row */}
            <div
              className="grid pb-3 pt-1"
              style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}
            >
              <div className="max-md:relative md:sticky md:left-0 bg-card z-10" />
              {months.map((m) => (
                <div key={m.monthYear} className="px-1 flex flex-col items-center gap-1">
                  {m.saldo !== 0 && (
                    <button
                      onClick={() => setTransferMonth(m)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 ${m.saldo > 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        }`}
                      title="Transferir Saldo"
                    >
                      {m.saldo > 0 ? (
                        <ArrowUpFromLine className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                      )}
                      Transferir
                    </button>
                  )}
                  {m.saldo > 0 && goalsWithBalance.length > 0 && (
                    <button
                      onClick={() => setGoalTransferMonth(m)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 transition-opacity hover:opacity-80"
                      title="Transferir para Objetivo"
                    >
                      + Objetivo
                      <Target className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {transferMonth && (
        <MonthTransferModal
          open={!!transferMonth}
          onOpenChange={(open) => !open && setTransferMonth(null)}
          targetMonth={transferMonth.month}
          targetYear={transferMonth.year}
          targetSaldo={transferMonth.saldo}
        />
      )}

      {goalTransferMonth && (
        <GoalTransferModal
          open={!!goalTransferMonth}
          onOpenChange={(open) => !open && setGoalTransferMonth(null)}
          mode="transfer"
          defaultMonthYear={goalTransferMonth.monthYear}
          targetSaldo={goalTransferMonth.saldo}
          goals={goalsWithBalance}
          envelopes={activeGoalEnvelopes}
          onTransfer={async (params) => {
            await goalTransferMutation.mutateAsync(params);
            setGoalTransferMonth(null);
          }}
          onWithdraw={async () => { }}
        />
      )}
    </div>
  );
}
