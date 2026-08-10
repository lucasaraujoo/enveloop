"use client";

import { useState } from "react";
import { EnvelopeCell } from "@/services/dashboard.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";

interface MonthCellProps {
  cell: EnvelopeCell;
  envelopeColor?: string;
  month: number;
  year: number;
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

export function MonthCell({ cell, envelopeColor, month, year, onUpdateLimit }: MonthCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newLimit, setNewLimit] = useState(cell.limit.toString());
  const [isSaving, setIsSaving] = useState(false);

  const percentage = cell.limit > 0 ? Math.min((cell.consumed / cell.limit) * 100, 100) : 0;
  const isOverBudget = cell.consumed > cell.limit && cell.limit > 0;
  const remaining = cell.limit - cell.consumed;

  const barColor = isOverBudget
    ? "bg-red-500"
    : percentage >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  const color = envelopeColor || "#6366f1";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateLimit(month, year, cell.envelopeId, Number(newLimit));
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="group relative flex flex-col gap-1.5 rounded-xl border border-border/50 bg-card p-3 transition-all hover:border-border hover:shadow-sm cursor-pointer"
        onClick={() => {
          setNewLimit(cell.limit.toString());
          setIsOpen(true);
        }}
      >
        {/* Values */}
        <div className="flex items-baseline justify-between gap-1">
          <span
            className={`text-base font-semibold tabular-nums ${isOverBudget ? "text-red-500" : "text-foreground"
              }`}
          >
            {formatCurrency(cell.consumed)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground tabular-nums group-hover:text-foreground transition-colors">
              / {formatCurrency(cell.limit)}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Percentage + remaining */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground">
            {percentage.toFixed(0)}%
          </span>
          <span
            className={`text-[10px] ${isOverBudget ? "text-red-500 font-medium" : "text-muted-foreground"
              }`}
          >
            {isOverBudget
              ? `+${formatCurrency(Math.abs(remaining))}`
              : remaining > 0
                ? `${formatCurrency(remaining)} livre`
                : "zerado"}
          </span>
        </div>

        {/* Virtual badge */}
        {cell.isVirtual && (
          <div className="absolute top-1.5 right-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" title="Mês não materializado" />
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Limite</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {cell.isVirtual && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                Este mês ainda não está materializado. Salvar um novo limite irá materializá-lo e fixar os valores atuais para este mês.
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="limit">Novo Limite (R$)</Label>
              <Input
                id="limit"
                type="number"
                step="1"
                min="0"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
