"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { transactionService } from "@/services/transaction.service";
import { useQueryClient } from "@tanstack/react-query";

interface MonthTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMonth?: number;
  targetYear?: number;
  targetSaldo?: number;
}

export function MonthTransferModal({
  open,
  onOpenChange,
  targetMonth,
  targetYear,
  targetSaldo,
}: MonthTransferModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [sourceMonth, setSourceMonth] = useState(targetMonth || new Date().getMonth() + 1);
  const [sourceYear, setSourceYear] = useState(targetYear || new Date().getFullYear());
  const [destMonth, setDestMonth] = useState(1);
  const [destYear, setDestYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("Transferência entre meses");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const m = targetMonth || (new Date().getMonth() + 1);
      const y = targetYear || new Date().getFullYear();

      const isDeficit = targetSaldo !== undefined && targetSaldo <= 0;

      const newSourceMonth = isDeficit ? (m === 1 ? 12 : m - 1) : m;
      const newSourceYear = isDeficit ? (m === 1 ? y - 1 : y) : y;
      const newDestMonth = isDeficit ? m : (m === 12 ? 1 : m + 1);
      const newDestYear = isDeficit ? y : (m === 12 ? y + 1 : y);

      setSourceMonth(newSourceMonth);
      setSourceYear(newSourceYear);
      setDestMonth(newDestMonth);
      setDestYear(newDestYear);
      setAmount(targetSaldo ? Math.abs(targetSaldo) : 0);
      setDescription("Transferência entre meses");
    }
  }, [open, targetMonth, targetYear, targetSaldo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || amount <= 0) return;

    if (sourceMonth === destMonth && sourceYear === destYear) {
      toast.error("O mês de origem e destino não podem ser os mesmos");
      return;
    }

    setIsSubmitting(true);
    try {
      const sourceMonthStr = sourceMonth.toString().padStart(2, "0");
      const destMonthStr = destMonth.toString().padStart(2, "0");

      await transactionService.createMonthTransfer(
        user.uid,
        { month: sourceMonth, year: sourceYear, monthYear: `${sourceYear}-${sourceMonthStr}` },
        { month: destMonth, year: destYear, monthYear: `${destYear}-${destMonthStr}` },
        amount,
        description,
        new Date() // Today
      );

      toast.success("Transferência realizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
      setAmount(0);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao realizar transferência");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transferir Saldo entre Meses</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Mês Origem</Label>
              <Select
                value={sourceMonth.toString()}
                onValueChange={(val) => setSourceMonth(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ano Origem</Label>
              <Input
                type="number"
                value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Mês Destino</Label>
              <Select
                value={destMonth.toString()}
                onValueChange={(val) => setDestMonth(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ano Destino</Label>
              <Input
                type="number"
                value={destYear}
                onChange={(e) => setDestYear(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              Valor (R$)
              {targetSaldo !== undefined && targetSaldo > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  máx: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(targetSaldo)}
                </span>
              )}
            </Label>
            <Input
              type="text"
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(amount)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                let numeric = digits ? parseInt(digits, 10) / 100 : 0;
                if (targetSaldo !== undefined && targetSaldo > 0) {
                  numeric = Math.min(numeric, targetSaldo);
                }
                setAmount(numeric);
              }}
              onFocus={(e) => e.target.select()}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                "Confirmar Transferência"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
