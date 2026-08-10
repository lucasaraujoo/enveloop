"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransactionFormValues, transactionSchema } from "../schemas/transaction.schema";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { useCards } from "@/features/cards/hooks/useCards";
import { useEnvelopes } from "@/features/envelopes/hooks/useEnvelopes";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { transactionService } from "@/services/transaction.service";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

const TYPE_LABELS: Record<string, string> = {
  expense: "Despesa",
  income: "Receita",
  card_purchase: "Compra no Cartão",
  bill_payment: "Pagamento de Fatura",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  debit: "Débito",
  ted: "TED/DOC",
  cash: "Dinheiro",
};

interface TransactionFormProps {
  initialData?: any;
  defaultType?: TransactionFormValues["type"];
  defaultReferenceMonthYear?: string; // "YYYY-MM"
  onSubmit: (data: TransactionFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function TransactionForm({
  initialData,
  defaultType = "card_purchase",
  defaultReferenceMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  onSubmit,
  isSubmitting = false,
}: TransactionFormProps) {
  const { accountsQuery, activeAccounts } = useAccounts();
  const { cardsQuery, activeCards } = useCards();
  const { envelopesQuery, activeEnvelopes } = useEnvelopes();
  const { categoriesQuery, activeCategories } = useCategories();

  const accounts = accountsQuery.data || [];
  const cards = cardsQuery.data || [];
  const envelopes = envelopesQuery.data || [];
  const categories = categoriesQuery.data || [];

  const defaultInvoiceMonthYear = (() => {
    const [y, m] = defaultReferenceMonthYear.split("-").map(Number);
    const nextMonth = new Date(y, m, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  })();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData || {
      type: defaultType,
      description: "",
      amount: 0,
      date: new Date(),
      referenceMonthYear: defaultReferenceMonthYear,
      invoiceMonthYear: defaultInvoiceMonthYear,
      paymentMethod: "pix",
      installments: 1,
    },
  });

  const { user } = useAuth();
  const [preCalculatedAmount, setPreCalculatedAmount] = useState<number | null>(null);
  const [confirmPaymentData, setConfirmPaymentData] = useState<TransactionFormValues | null>(null);

  const selectedType = form.watch("type");
  const selectedReferenceMonthYear = form.watch("referenceMonthYear");
  const selectedInvoiceMonthYear = form.watch("invoiceMonthYear");
  const selectedCardId = form.watch("cardId");
  const selectedDate = form.watch("date");
  const selectedInstallments = form.watch("installments") ?? 1;
  const watchedAmount = form.watch("amount") ?? 0;

  // Installment value calculation
  const installmentValue = selectedInstallments > 1 && watchedAmount > 0
    ? Math.floor((watchedAmount * 100) / selectedInstallments) / 100
    : null;
  const installmentHint = installmentValue !== null
    ? `${selectedInstallments}x de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installmentValue)}`
    : null;
  const [monthStatus, setMonthStatus] = useState<"neutral" | "auto" | "manual">("neutral");

  useEffect(() => {
    if (monthStatus === "manual" || !selectedDate) return;

    let baseRefDate = new Date(selectedDate);
    let baseInvDate = new Date(selectedDate);
    baseInvDate.setMonth(baseInvDate.getMonth() + 1);

    if (selectedType === "card_purchase" && selectedCardId) {
      const card = cards.find((c) => c.id === selectedCardId);
      if (card?.closingDay && card?.dueDay) {
        const purchaseDay = selectedDate.getDate();
        const cDay = card.closingDay;
        const dDay = card.dueDay;

        if (cDay < dDay) {
          if (purchaseDay < cDay) {
            baseRefDate.setMonth(baseRefDate.getMonth() - 1);
            baseInvDate.setMonth(baseInvDate.getMonth() - 1);
          }
        } else {
          if (purchaseDay >= cDay) {
            baseRefDate.setMonth(baseRefDate.getMonth() + 1);
            baseInvDate.setMonth(baseInvDate.getMonth() + 1);
          }
        }
      }
    }

    const refStr = `${baseRefDate.getFullYear()}-${String(baseRefDate.getMonth() + 1).padStart(2, "0")}`;
    const invStr = `${baseInvDate.getFullYear()}-${String(baseInvDate.getMonth() + 1).padStart(2, "0")}`;

    const currentRef = form.getValues("referenceMonthYear");
    const currentInv = form.getValues("invoiceMonthYear");

    let changed = false;
    if (currentRef !== refStr) {
      form.setValue("referenceMonthYear", refStr);
      changed = true;
    }
    if (currentInv !== invStr) {
      form.setValue("invoiceMonthYear", invStr);
      changed = true;
    }
    if (changed) setMonthStatus("auto");
  }, [selectedDate, selectedType, selectedCardId, cards, form, monthStatus]);

  const monthSelectClass = monthStatus === "manual"
    ? "flex-1 border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/10 transition-colors"
    : monthStatus === "auto"
    ? "flex-1 border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/10 transition-colors"
    : "flex-1 transition-colors";

  const { data: billInfo, isFetching: isLoadingBillInfo } = useQuery({
    queryKey: ["billPaymentInfo", selectedType, selectedCardId, selectedInvoiceMonthYear],
    queryFn: async () => {
      if ((selectedType !== "bill_payment" && selectedType !== "card_purchase") || !selectedCardId || !selectedInvoiceMonthYear || !user) return null;
      return await transactionService.getBillPaymentInfo(user.uid, selectedCardId, selectedInvoiceMonthYear);
    },
    enabled: (selectedType === "bill_payment" || selectedType === "card_purchase") && !!selectedCardId && !!selectedInvoiceMonthYear && !!user,
  });

  useEffect(() => {
    if (selectedType !== "bill_payment") {
      setPreCalculatedAmount(null);
      return;
    }
    if (billInfo) {
      if (billInfo.alreadyPaid) {
        form.setValue("amount", 0);
        setPreCalculatedAmount(0);
      } else {
        const total = Math.max(billInfo.pendingTotal, 0);
        form.setValue("amount", total, { shouldValidate: true });
        setPreCalculatedAmount(total);
        const currentDesc = form.getValues("description") || "";
        if (!currentDesc || currentDesc.toLowerCase().startsWith("pagamento de fatura")) {
          const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
          const [invoiceYear, invoiceMonth] = (selectedInvoiceMonthYear || "").split("-").map(Number);
          const monthNameRaw = new Date(2000, (invoiceMonth || 1) - 1, 1).toLocaleString("pt-BR", { month: "long" });
          const monthName = monthNameRaw.charAt(0).toUpperCase() + monthNameRaw.slice(1);
          
          const descBase = `Pagamento de fatura de ${monthName}`;
          
          const desc = billInfo.residual !== 0 
            ? `${descBase} (inclui ${billInfo.residual > 0 ? 'resíduo' : 'crédito'} de ${formatter.format(Math.abs(billInfo.residual))})`
            : descBase;
          form.setValue("description", desc);
        }
      }
    }
  }, [billInfo, selectedType, selectedInvoiceMonthYear, form]);

  // Types that show paymentMethod field
  const showPaymentMethod = selectedType === "expense" || selectedType === "income" || selectedType === "bill_payment";
  // Types that show account
  const showAccount = selectedType === "expense" || selectedType === "income" || selectedType === "bill_payment";
  // Types that show card
  const showCard = selectedType === "card_purchase" || selectedType === "bill_payment";
  // Types that show envelope + category
  const showEnvelope = selectedType === "expense" || selectedType === "card_purchase";

  const processSubmit = async (values: TransactionFormValues) => {
    try {
      const payload = values.type === "card_purchase"
        ? { ...values, paymentMethod: "credit_card" as const }
        : { ...values };

      const cleanedPayload: any = { ...payload };
      for (const key in cleanedPayload) {
        if (cleanedPayload[key] === undefined) {
          cleanedPayload[key] = null;
        }
      }

      await onSubmit(cleanedPayload as TransactionFormValues);
      form.reset({
        type: defaultType,
        description: "",
        amount: 0,
        date: new Date(),
        referenceMonthYear: defaultReferenceMonthYear,
        invoiceMonthYear: defaultInvoiceMonthYear,
        paymentMethod: "pix",
        installments: 1,
      });
      setConfirmPaymentData(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar transação");
    }
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    if (values.type === "bill_payment" && preCalculatedAmount !== null && values.amount !== preCalculatedAmount) {
      setConfirmPaymentData(values);
      return;
    }
    await processSubmit(values);
  };

  const handleInvalidSubmit = (errors: typeof form.formState.errors) => {
    // Show the first error as a toast
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast.error(firstError.message as string);
    } else {
      toast.error("Preencha todos os campos obrigatórios");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-4">
      {/* Linha 1: Tipo e Data */}
      <div className="grid grid-cols-[1fr_auto] gap-3 sm:gap-4">
        {/* Tipo */}
        <div className="grid gap-2">
          <Label>Tipo de Lançamento</Label>
          <Select
            value={selectedType}
            onValueChange={(val: any) => {
              form.setValue("type", val);
              // Clear fields that don't apply to the new type
              form.setValue("accountId", undefined);
              form.setValue("cardId", undefined);
              form.setValue("envelopeId", undefined);
              form.setValue("categoryId", undefined);
              if (val !== "card_purchase") {
                form.setValue("paymentMethod", "pix"); // Reset to default when changing types
              } else {
                form.setValue("paymentMethod", undefined);
              }
              form.clearErrors();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo">
                {TYPE_LABELS[selectedType] ?? selectedType}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="card_purchase">Compra no Cartão</SelectItem>
              <SelectItem value="bill_payment">Pagamento de Fatura</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data */}
        <div className="grid gap-2">
          <Label>Data</Label>
          <Controller
            name="date"
            control={form.control}
            render={({ field }) => (
              <Input
                type="date"
                className="w-[145px] sm:w-full px-2"
                value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const val = e.target.valueAsDate || new Date(e.target.value + "T12:00:00");
                  field.onChange(val);
                }}
              />
            )}
          />
          {form.formState.errors.date && (
            <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>
          )}
        </div>
      </div>

      {/* Linha 2: Conta e Cartão */}
      {(showAccount || showCard) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Conta */}
          {showAccount && (
            <div className={`grid gap-2 ${!showCard ? 'col-span-2' : ''}`}>
              <Label>Conta</Label>
              <Select
                value={form.watch("accountId") ?? null}
                onValueChange={(val) => form.setValue("accountId", val || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta">
                    {accounts?.find((a) => a.id === form.watch("accountId"))?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {activeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id!}>
                      {acc.name}
                    </SelectItem>
                  ))}
                  {form.watch("accountId") && !activeAccounts.find(a => a.id === form.watch("accountId")) && accounts?.find(a => a.id === form.watch("accountId")) && (
                    <SelectItem value={form.watch("accountId")!}>
                      {accounts?.find((a) => a.id === form.watch("accountId"))?.name} (Inativa)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.accountId && (
                <p className="text-xs text-red-500">{form.formState.errors.accountId.message}</p>
              )}
            </div>
          )}

          {/* Cartão */}
          {showCard && (
            <div className={`grid gap-2 ${!showAccount ? 'col-span-2' : ''}`}>
              <Label>Cartão de Crédito</Label>
              <Select
                value={form.watch("cardId") ?? null}
                onValueChange={(val) => form.setValue("cardId", val || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão">
                    {cards?.find((c) => c.id === form.watch("cardId"))?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {activeCards.map((card) => (
                    <SelectItem key={card.id} value={card.id!}>
                      {card.name}
                    </SelectItem>
                  ))}
                  {form.watch("cardId") && !activeCards.find(c => c.id === form.watch("cardId")) && cards?.find(c => c.id === form.watch("cardId")) && (
                    <SelectItem value={form.watch("cardId")!}>
                      {cards?.find((c) => c.id === form.watch("cardId"))?.name} (Inativo)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.cardId && (
                <p className="text-xs text-red-500">{form.formState.errors.cardId.message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Linha 3: Envelope e Categoria */}
      {showEnvelope && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Envelope</Label>
            <Select
              value={form.watch("envelopeId") ?? null}
              onValueChange={(val) => form.setValue("envelopeId", val || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o envelope">
                  {envelopes?.find((e) => e.id === form.watch("envelopeId"))?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {activeEnvelopes.map((env) => (
                  <SelectItem key={env.id} value={env.id!}>
                    {env.name}
                  </SelectItem>
                ))}
                {form.watch("envelopeId") && !activeEnvelopes.find(e => e.id === form.watch("envelopeId")) && envelopes?.find(e => e.id === form.watch("envelopeId")) && (
                  <SelectItem value={form.watch("envelopeId")!}>
                    {envelopes?.find((e) => e.id === form.watch("envelopeId"))?.name} (Inativo)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.envelopeId && (
              <p className="text-xs text-red-500">{form.formState.errors.envelopeId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Categoria (Opcional)</Label>
            <Select
              value={form.watch("categoryId") ?? null}
              onValueChange={(val) =>
                form.setValue("categoryId", (val === "none" ? undefined : val) as string | undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma categoria">
                  {categories?.find((c) => c.id === form.watch("categoryId"))?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="none">Nenhuma categoria</SelectItem>
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id!}>
                    {cat.name}
                  </SelectItem>
                ))}
                {form.watch("categoryId") && form.watch("categoryId") !== "none" && !activeCategories.find(c => c.id === form.watch("categoryId")) && categories?.find(c => c.id === form.watch("categoryId")) && (
                  <SelectItem value={form.watch("categoryId")!}>
                    {categories?.find((c) => c.id === form.watch("categoryId"))?.name} (Inativa)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Linha 4: Valor, Parcelamento e Método de Pagamento */}
      <div className="grid grid-cols-2 gap-4">
        {/* Valor */}
        <div className={`grid gap-2 ${!showPaymentMethod && !(selectedType === "card_purchase") ? 'col-span-2' : ''}`}>
          <Label>
            {selectedType === "card_purchase" && selectedInstallments > 1
              ? "Valor Total da Compra (R$)"
              : "Valor (R$)"}
          </Label>
          <Controller
            name="amount"
            control={form.control}
            render={({ field }) => {
              const displayValue = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(field.value || 0);

              return (
                <Input
                  type="text"
                  value={displayValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    const numericValue = Number(value) / 100;
                    field.onChange(numericValue);
                  }}
                  onFocus={(e) => e.target.select()}
                />
              );
            }}
          />
          {installmentHint && (
            <p className="text-xs text-muted-foreground">{installmentHint}</p>
          )}
          {form.formState.errors.amount && (
            <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
          )}
        </div>

        {/* Parcelamento — ao lado do valor para card_purchase */}
        {selectedType === "card_purchase" && (
          <div className="grid gap-2">
            <Label>Parcelamento</Label>
            <Select
              value={String(selectedInstallments)}
              onValueChange={(val) => form.setValue("installments", Number(val))}
            >
              <SelectTrigger>
                <SelectValue>
                  {selectedInstallments}x
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i + 1}x
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Método de Pagamento */}
        {showPaymentMethod && (
          <div className="grid gap-2">
            <Label>Método de Pagamento</Label>
            <Select
              value={form.watch("paymentMethod") ?? null}
              onValueChange={(val: any) => form.setValue("paymentMethod", val || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método">
                  {PAYMENT_LABELS[form.watch("paymentMethod") ?? ""] ?? undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="ted">TED/DOC</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.paymentMethod && (
              <p className="text-xs text-red-500">{form.formState.errors.paymentMethod.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Linha 5: Meses */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mês do Orçamento */}
        <div className={`grid gap-2 ${(selectedType !== "card_purchase" && selectedType !== "bill_payment") ? "col-span-2" : ""}`}>
          <Label>Mês do Orçamento</Label>
          <div className="flex gap-2">
            <Select
              value={selectedReferenceMonthYear?.split("-")[1]}
              onValueChange={(m) => {
                setMonthStatus("manual");
                form.setValue("referenceMonthYear", `${selectedReferenceMonthYear?.split("-")[0]}-${m}`);
              }}
            >
              <SelectTrigger className={monthSelectClass}>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedReferenceMonthYear?.split("-")[0]}
              onValueChange={(y) => {
                setMonthStatus("manual");
                form.setValue("referenceMonthYear", `${y}-${selectedReferenceMonthYear?.split("-")[1]}`);
              }}
            >
              <SelectTrigger className={monthSelectClass}>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {Array.from({ length: 11 }).map((_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        {form.formState.errors.referenceMonthYear && (
          <p className="text-xs text-red-500">{form.formState.errors.referenceMonthYear.message}</p>
        )}
      </div>

      {/* Mês da Fatura — apenas cartão */}
      {(selectedType === "card_purchase" || selectedType === "bill_payment") && (
        <div className="grid gap-2">
          <Label>Mês da Fatura</Label>
          <div className="flex gap-2">
            <Select
              value={selectedInvoiceMonthYear?.split("-")[1]}
              onValueChange={(m) => {
                setMonthStatus("manual");
                form.setValue("invoiceMonthYear", `${selectedInvoiceMonthYear?.split("-")[0]}-${m}`);
              }}
            >
              <SelectTrigger className={monthSelectClass}>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedInvoiceMonthYear?.split("-")[0]}
              onValueChange={(y) => {
                setMonthStatus("manual");
                form.setValue("invoiceMonthYear", `${y}-${selectedInvoiceMonthYear?.split("-")[1]}`);
              }}
            >
              <SelectTrigger className={monthSelectClass}>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {form.formState.errors.invoiceMonthYear && (
            <p className="text-xs text-red-500">{form.formState.errors.invoiceMonthYear.message}</p>
          )}
        </div>
      )}
      </div>

      {/* Linha 6: Descrição */}
      <div className="grid gap-2">
        <Label>Descrição</Label>
        <Input {...form.register("description")} placeholder="Ex: Mercado, Salário, etc." />
        {form.formState.errors.description && (
          <p className="text-xs text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      {selectedType === "bill_payment" && billInfo?.alreadyPaid && (
        <Alert variant="destructive">
          <AlertTitle>Fatura já paga</AlertTitle>
          <AlertDescription>
            Já existe um pagamento de fatura para este cartão neste mês. 
            Exclua o pagamento anterior para lançar um novo.
          </AlertDescription>
        </Alert>
      )}

      {selectedType === "card_purchase" && billInfo?.alreadyPaid && (
        <Alert variant="destructive">
          <AlertTitle>Fatura Paga</AlertTitle>
          <AlertDescription>
            A fatura de referência já foi paga. Exclua o pagamento para lançar novos itens neste mês.
          </AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSubmitting || ((selectedType === "bill_payment" || selectedType === "card_purchase") && billInfo?.alreadyPaid === true)}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          "Salvar Transação"
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmPaymentData} onOpenChange={(open) => !open && setConfirmPaymentData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento Diferente</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPaymentData?.amount && preCalculatedAmount !== null && confirmPaymentData.amount > preCalculatedAmount
                ? "Você está pagando um valor diferente do total de compras lançadas. Deseja continuar?"
                : "Você está pagando um valor diferente do total de compras lançadas. Todos os itens dessa fatura serão marcados como pago e o valor restante irá compor o valor das próximas faturas pendentes. Deseja continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPaymentData && processSubmit(confirmPaymentData)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

