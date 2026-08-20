"use client";

import { useState } from "react";
import { MonthSummaryData } from "@/services/dashboard.service";
import { ArrowDownToLine, ArrowUpFromLine, Minus, ArrowRightLeft } from "lucide-react";
import { MonthTransferModal } from "@/features/transactions/components/MonthTransferModal";

interface MonthSummaryProps {
  months: MonthSummaryData[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function SummaryRow({
  label,
  months,
  getValue,
  className,
}: {
  label: string;
  months: MonthSummaryData[];
  getValue: (m: MonthSummaryData) => number;
  className?: string | ((m: MonthSummaryData) => string);
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `200px repeat(${months.length}, minmax(140px, 1fr))`,
      }}
    >
      <div className="sticky left-0 bg-background z-10 flex items-center pr-4 py-2">
        <span className={`text-xs font-medium text-muted-foreground`}>
          {label}
        </span>
      </div>
      {months.map((m) => {
        const value = getValue(m);
        const colClass = typeof className === "function" ? className(m) : className;
        return (
          <div key={m.monthYear} className="px-1 py-2">
            <span
              className={`block text-center text-sm font-semibold tabular-nums ${colClass ?? "text-foreground"
                }`}
            >
              {formatCurrency(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MonthSummary({ months }: MonthSummaryProps) {
  const [transferMonth, setTransferMonth] = useState<MonthSummaryData | null>(null);

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/30 overflow-x-auto">
      <div className="min-w-max">
        {/* Header row */}
        <div
          className="grid border-b border-border/50 pb-2 pt-3"
          style={{
            gridTemplateColumns: `200px repeat(${months.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="sticky left-0 bg-muted/30 z-10 px-4">
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

        <div className="px-4 py-1 divide-y divide-border/30">
          <SummaryRow
            label="Total Planejado"
            months={months}
            getValue={(m) => m.totalPlanned}
            className={(m) => ((m.totalIncome > 0 || m.totalExpenses > 0) && m.totalPlanned > m.totalIncome) ? "text-destructive" : "text-muted-foreground"}
          />
          <SummaryRow
            label="Receitas"
            months={months}
            getValue={(m) => m.totalIncome}
            className="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryRow
            label="Despesas"
            months={months}
            getValue={(m) => m.totalExpenses}
            className={(m) => m.totalExpenses > m.totalIncome ? "text-destructive" : "text-orange-600 dark:text-orange-500"}
          />
          <SummaryRow
            label="Saldo"
            months={months}
            getValue={(m) => m.saldo}
            className={(m) => m.saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}
          />
        </div>

        {/* Free balance color cue and Transfer Button */}
        <div
          className="grid px-4 pb-3"
          style={{
            gridTemplateColumns: `200px repeat(${months.length}, minmax(140px, 1fr))`,
          }}
        >
          <div className="sticky left-0 bg-muted/30 z-10" />
          {months.map((m) => (
            <div key={m.monthYear} className="px-1 flex flex-col items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.saldo > 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : m.saldo < 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {m.saldo > 0 ? (
                  <ArrowUpFromLine className="h-3 w-3" />
                ) : m.saldo < 0 ? (
                  <ArrowDownToLine className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {m.saldo > 0 ? "Sobra" : m.saldo < 0 ? "Déficit" : "Zerado"}
              </span>

              <button
                onClick={() => setTransferMonth(m)}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                title="Transferir Saldo"
              >
                <ArrowRightLeft className="h-3 w-3" />
                Transferir
              </button>
            </div>
          ))}
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
    </div>
  );
}
