"use client";

import { Wallet, CreditCard, TrendingUp } from "lucide-react";

interface GlobalIndicatorsProps {
  totalBalance: number;
  totalPendingBills: number;
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
}: GlobalIndicatorsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Saldo Geral */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-100">Saldo Geral</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(totalBalance)}
            </p>
            <p className="mt-1 text-xs text-emerald-200">
              Soma de todas as contas ativas
            </p>
          </div>
          <div className="rounded-xl bg-white/20 p-2.5">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
        {/* Decorative circle */}
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
      </div>

      {/* Faturas Pendentes */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-rose-100">Faturas Pendentes</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(totalPendingBills)}
            </p>
            <p className="mt-1 text-xs text-rose-200">
              Compras no cartão não pagas
            </p>
          </div>
          <div className="rounded-xl bg-white/20 p-2.5">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
