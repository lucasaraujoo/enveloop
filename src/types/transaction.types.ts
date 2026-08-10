import { Timestamp } from "firebase/firestore";

export type TransactionType =
  | "income"
  | "expense"
  | "card_purchase"
  | "bill_payment"
  | "month_transfer_out"
  | "month_transfer_in"
  | "goal_transfer"     // Alimenta um objetivo — debita o mês de origem
  | "goal_withdraw";   // Saca de um objetivo — credita o mês de destino

export type PaymentMethod =
  | "pix"
  | "cash"
  | "ted"
  | "debit"
  | "credit_card";

export type TransactionStatus = "paid" | "pending" | "reversed" | "cancelled";

export interface Transaction {
  id?: string;
  date: Timestamp | Date;
  referenceMonthYear: string; // "YYYY-MM" — mês/ano que afeta o orçamento (envelopes e saldo mensal)
  invoiceMonthYear?: string;  // "YYYY-MM" — mês/ano da fatura (apenas card_purchase e bill_payment)
  type: TransactionType;
  amount: number;
  description: string;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  cardId?: string;
  envelopeId?: string;
  categoryId?: string;
  relatedTransactionId?: string;
  goalId?: string;            // Obrigatório para goal_transfer e goal_withdraw
  billPaymentId?: string;   // ID do bill_payment que quitou esta card_purchase
  appliedReduction?: number; // Para bill_payment: o valor exato que foi abatido do pendingBills do cartão na hora da criação
  installmentId?: string;   // UUID compartilhado por todas as parcelas de uma compra parcelada
  status: TransactionStatus;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

