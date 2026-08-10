"use client";

import { MonthSummaryData } from "@/services/dashboard.service";
import { Envelope } from "@/types/envelope.types";
import { MonthCell } from "./MonthCell";
import { gridCols } from "./MonthGrid";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EnvelopeRowProps {
  envelope: Envelope;
  months: MonthSummaryData[];
  isMobile?: boolean;
  onUpdateLimit: (month: number, year: number, envelopeId: string, limit: number) => Promise<void>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function EnvelopeRow({ envelope, months, isMobile, onUpdateLimit }: EnvelopeRowProps) {
  const color = envelope.color || "#6366f1";

  return (
    <div className="grid" style={{ gridTemplateColumns: gridCols(months.length, isMobile) }}>
      {/* Envelope name cell */}
      <div className="flex items-center gap-2.5 px-2 sm:px-4 py-1 max-md:relative md:sticky md:left-0 md:bg-card z-10 border-r border-border/50 md:border-r-0">
        <div
          className="h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{envelope.name}</p>
          <div className="mt-0.5">
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold border"
              style={{
                backgroundColor: color + "88", // 20% opacity background for better contrast
                color: "#fff",
                borderColor: color + "66" // 40% opacity border
              }}
            >
              {formatCurrency(envelope.defaultAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Month cells */}
      {months.map((month) => {
        const cell = month.envelopes.find((e) => e.envelopeId === envelope.id);
        if (!cell) {
          // Envelope not in this month
          return (
            <div
              key={month.monthYear}
              className="px-1 py-1 flex items-center justify-center"
            >
              <span className="text-xs text-muted-foreground/40">—</span>
            </div>
          );
        }
        return (
          <div key={month.monthYear} className="px-1 py-1">
            <MonthCell
              cell={cell}
              envelopeColor={color}
              month={month.month}
              year={month.year}
              onUpdateLimit={onUpdateLimit}
            />
          </div>
        );
      })}
    </div>
  );
}
