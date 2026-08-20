"use client";

import { useState } from "react";
import { Wallet, CreditCard, Target, ShieldCheck, Loader2, ChevronDown } from "lucide-react";

interface GlobalIndicatorsProps {
  totalBalance: number;
  totalPendingBills: number;
  totalInGoals: number;
  isGoalsLoading?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function GlobalIndicators({
  totalBalance,
  totalPendingBills,
  totalInGoals,
  isGoalsLoading = false,
}: GlobalIndicatorsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalComprometido = totalPendingBills + totalInGoals;
  const saldoLivre = totalBalance - totalComprometido;

  const isNegative = totalBalance < 0 || saldoLivre < 0;

  // Dynamic gradient: green → amber → red based on balance/saldo livre
  const gradientClass = isNegative
    ? "from-rose-500 to-pink-600"
    : saldoLivre === 0
    ? "from-amber-500 to-amber-600"
    : "from-emerald-500 to-teal-600";

  // Adaptive text colors that maintain contrast on each gradient
  const labelColor = isNegative
    ? "text-rose-100"
    : saldoLivre === 0
    ? "text-amber-100"
    : "text-emerald-100";

  const mutedColor = isNegative
    ? "text-rose-200"
    : saldoLivre === 0
    ? "text-amber-200"
    : "text-emerald-200";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} p-3 sm:p-4 lg:p-5 text-white shadow-lg transition-all duration-700`}
    >
      {/* Layout: stacked on mobile, side-by-side on lg+ */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
        {/* Left — Saldo Geral */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-medium ${labelColor}`}>Saldo Geral</p>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                {formatCurrency(totalBalance)}
              </p>
              <p className={`text-xs ${mutedColor}`}>
                Soma de todas as contas ativas
              </p>
            </div>
            {/* Icon — visible on mobile and when expanded area is hidden on lg */}
            <div className="rounded-xl bg-white/20 p-2 shrink-0 lg:hidden">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Right — Comprometido box (side-by-side on lg) */}
        <div className="mt-2 lg:mt-0 lg:w-96 shrink-0 rounded-xl bg-black/10 backdrop-blur-sm overflow-hidden">
          
          {/* Header row with minimize toggle (Mobile ONLY) */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 transition-colors lg:hidden"
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}
            >
              Comprometido
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 ${mutedColor} transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Header row (Desktop ONLY) */}
          <div className="hidden lg:flex items-center justify-between px-3 pt-3 pb-1">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}
            >
              Comprometido
            </span>
          </div>

          {/* Collapsible detail content: Toggles on mobile, ALWAYS visible on desktop */}
          <div
            className={`grid transition-all duration-300 ease-in-out lg:!grid-rows-[1fr] lg:!opacity-100 ${
              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-3 pb-2.5 lg:px-3 lg:pb-3 space-y-1.5 lg:space-y-2">
                {/* Faturas Pendentes */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <CreditCard className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-rose-300/80" />
                    <span className={`text-xs lg:text-sm ${labelColor}`}>
                      Faturas Pendentes
                    </span>
                  </div>
                  <span className={`text-xs lg:text-sm font-medium ${totalPendingBills < 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {formatCurrency(totalPendingBills)}
                  </span>
                </div>

                {/* Guardado em Objetivos */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <Target className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-violet-300/80" />
                    <span className={`text-xs lg:text-sm ${labelColor}`}>
                      Guardado em Objetivos
                    </span>
                  </div>
                  {isGoalsLoading ? (
                    <Loader2
                      className={`h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin ${mutedColor}`}
                    />
                  ) : (
                    <span className="text-xs lg:text-sm font-medium text-violet-200">
                      {formatCurrency(totalInGoals)}
                    </span>
                  )}
                </div>

                {/* Divider + Saldo Livre */}
                <div className="border-t border-white/15 pt-1.5 lg:pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 lg:gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-white/60" />
                      <span className="text-xs lg:text-sm font-semibold text-white/80">
                        Saldo Livre Estimado
                      </span>
                    </div>
                    {isGoalsLoading ? (
                      <Loader2
                        className={`h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin ${mutedColor}`}
                      />
                    ) : (
                      <span
                        className={`text-sm lg:text-base font-bold ${
                          saldoLivre >= 0 ? "text-white" : "text-rose-200"
                        }`}
                      >
                        {formatCurrency(saldoLivre)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop icon — top-right area on lg */}
        <div className="hidden lg:block rounded-xl bg-white/20 p-2.5 shrink-0">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      {/* Decorative circle */}
      <div className="absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/10 pointer-events-none" />
    </div>
  );
}
