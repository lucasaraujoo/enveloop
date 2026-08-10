import * as z from "zod";

export const transactionSchema = z
  .object({
    type: z.enum([
      "income",
      "expense",
      "card_purchase",
      "bill_payment",
      "month_transfer_out",
      "month_transfer_in",
    ]),
    description: z.string().min(1, "Descrição é obrigatória"),
    amount: z.number().positive("Valor deve ser maior que zero"),
    date: z.date(),
    referenceMonthYear: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido"),
    invoiceMonthYear: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Formato inválido")
      .optional(),
    paymentMethod: z
      .enum(["pix", "cash", "ted", "debit", "credit_card"])
      .optional(),
    accountId: z.string().optional(),
    cardId: z.string().optional(),
    envelopeId: z.string().optional(),
    categoryId: z.string().optional(),
    installments: z.number().int().min(1).max(12),
  })
  .superRefine((data, ctx) => {
    if (data.type === "expense") {
      if (!data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Conta é obrigatória para despesas",
          path: ["accountId"],
        });
      }
      if (!data.envelopeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Envelope é obrigatório para despesas",
          path: ["envelopeId"],
        });
      }
      if (!data.paymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Método de pagamento é obrigatório",
          path: ["paymentMethod"],
        });
      }
    }

    if (data.type === "income") {
      if (!data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Conta é obrigatória para receitas",
          path: ["accountId"],
        });
      }
    }

    if (data.type === "card_purchase") {
      if (!data.cardId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cartão é obrigatório para compras no cartão",
          path: ["cardId"],
        });
      }
      if (!data.envelopeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Envelope é obrigatório para compras no cartão",
          path: ["envelopeId"],
        });
      }
      if (!data.invoiceMonthYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mês da fatura é obrigatório para compras no cartão",
          path: ["invoiceMonthYear"],
        });
      }
      if (data.invoiceMonthYear && data.invoiceMonthYear < data.referenceMonthYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "O mês da fatura não pode ser anterior ao mês do orçamento",
          path: ["invoiceMonthYear"],
        });
      }
    }

    if (data.type === "bill_payment") {
      if (!data.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Conta de origem é obrigatória",
          path: ["accountId"],
        });
      }
      if (!data.cardId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cartão da fatura é obrigatório",
          path: ["cardId"],
        });
      }
      if (!data.invoiceMonthYear) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mês da fatura é obrigatório para pagamento de fatura",
          path: ["invoiceMonthYear"],
        });
      }
    }
  });

export type TransactionFormValues = z.infer<typeof transactionSchema>;
