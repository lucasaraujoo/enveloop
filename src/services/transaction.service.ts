import { userCol, userDoc } from "@/lib/firestore";
import { Transaction } from "@/types/transaction.types";
import { monthPlanService } from "./monthPlan.service";
import {
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  getDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const transactionService = {
  async getTransactionsByMonths(
    userId: string,
    monthYears: string[]
  ): Promise<Transaction[]> {
    if (monthYears.length === 0) return [];
    const col = userCol<Transaction>(userId, "transactions");
    const q = query(col, where("referenceMonthYear", "in", monthYears));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = (a.date as any)?.seconds || 0;
        const dateB = (b.date as any)?.seconds || 0;
        return dateB - dateA;
      });
  },

  async getTransactionsByInstallmentId(
    userId: string,
    installmentId: string
  ): Promise<Transaction[]> {
    const col = userCol<Transaction>(userId, "transactions");
    const q = query(col, where("installmentId", "==", installmentId));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  /**
   * Retorna informações sobre o pagamento da fatura de um cartão em um mês específico.
   * Verifica se já foi pago, e caso não, soma o total de compras pendentes.
   */
  async getBillPaymentInfo(
    userId: string,
    cardId: string,
    monthYear: string
  ): Promise<{ alreadyPaid: boolean; pendingTotal: number; residual: number }> {
    const colRef = userCol<Transaction>(userId, "transactions");
    
    // Check if paid — based on invoiceMonthYear
    const paidQ = query(
      colRef,
      where("type", "==", "bill_payment"),
      where("cardId", "==", cardId),
      where("invoiceMonthYear", "==", monthYear)
    );
    const paidSnap = await getDocs(paidQ);
    const alreadyPaid = !paidSnap.empty;

    if (alreadyPaid) return { alreadyPaid: true, pendingTotal: 0, residual: 0 };

    // Get all pending for this card (to find residual)
    const pendingQ = query(
      colRef,
      where("type", "==", "card_purchase"),
      where("cardId", "==", cardId),
      where("status", "==", "pending")
    );
    const pendingSnap = await getDocs(pendingQ);

    let sumAllPending = 0;
    let sumMonthPending = 0;

    pendingSnap.docs.forEach((doc) => {
      const data = doc.data();
      const amount = data.amount || 0;
      sumAllPending += amount;
      if (data.invoiceMonthYear === monthYear) {
        sumMonthPending += amount;
      }
    });

    // Get card pending bills
    const cardRef = userDoc(userId, "cards", cardId);
    const cardSnap = await getDoc(cardRef);
    const cardData = cardSnap.data() as any;
    const currentPendingBills = cardData?.pendingBills || 0;

    const residual = currentPendingBills - sumAllPending;
    // ensure no javascript floating point issues
    const safeResidual = Number(residual.toFixed(2));
    const pendingTotal = sumMonthPending + safeResidual;

    return { alreadyPaid: false, pendingTotal, residual: safeResidual };
  },

  async createTransaction(
    userId: string,
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">
  ): Promise<void> {
    const batch = writeBatch(db);
    const colRef = userCol<Transaction>(userId, "transactions");

    // 1. Ensure month plan is materialized for expense or card_purchase
    if (data.type === "expense" || data.type === "card_purchase") {
      const [refYear, refMonth] = data.referenceMonthYear.split("-").map(Number);
      await monthPlanService.ensureMonthPlan(userId, refMonth, refYear);
    }

    if (data.type === "month_transfer_out") {
      throw new Error("Use createMonthTransfer for month transfers");
    }

    // Bloqueia lançamento de nova compra se a fatura já estiver paga
    if (data.type === "card_purchase" && data.cardId) {
      const qBill = query(
        colRef,
        where("type", "==", "bill_payment"),
        where("cardId", "==", data.cardId),
        where("invoiceMonthYear", "==", data.invoiceMonthYear)
      );
      const snapBill = await getDocs(qBill);
      if (!snapBill.empty) {
        throw new Error("A fatura deste mês já foi paga. Exclua o pagamento antes de lançar novas compras.");
      }
    }

    // 2. Handle bill_payment: mark card_purchases as paid and update pendingBills
    if (data.type === "bill_payment" && data.cardId) {
      const qPending = query(
        colRef,
        where("type", "==", "card_purchase"),
        where("cardId", "==", data.cardId),
        where("invoiceMonthYear", "==", data.invoiceMonthYear),
        where("status", "==", "pending")
      );
      const pendingSnap = await getDocs(qPending);

      // Calculate the total of pending purchases being settled
      const pendingTotal = pendingSnap.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      // Generate ID for this bill_payment so we can link it to purchases
      const billPaymentId = crypto.randomUUID();

      pendingSnap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          status: "paid",
          billPaymentId,
          updatedAt: serverTimestamp(),
        });
      });

      // Decrement pendingBills on the card (destroy credit strategy - Opção B)
      const cardRef = userDoc(userId, "cards", data.cardId);
      const cardSnap = await getDoc(cardRef);
      const currentPendingBills = (cardSnap.data() as any)?.pendingBills ?? 0;
      
      const newPendingBills = Math.max(0, currentPendingBills - data.amount);
      const appliedReduction = currentPendingBills - newPendingBills;

      if (appliedReduction !== 0) {
        batch.update(cardRef, {
          pendingBills: increment(-appliedReduction),
          updatedAt: serverTimestamp(),
        });
      }

      // Decrement account balance
      if (data.accountId) {
        const accountRef = userDoc(userId, "accounts", data.accountId);
        batch.update(accountRef, {
          balance: increment(-data.amount),
          updatedAt: serverTimestamp(),
        });
      }

      // Create the bill_payment transaction with the generated ID
      const newDocRef = userDoc<Transaction>(userId, "transactions", billPaymentId);
      batch.set(newDocRef, {
        ...data,
        appliedReduction,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      });

      await batch.commit();
      return;
    }

    // 3. Handle other transaction types — update account.balance or card.pendingBills
    if (data.type === "income" && data.accountId) {
      const accountRef = userDoc(userId, "accounts", data.accountId);
      batch.update(accountRef, {
        balance: increment(data.amount),
        updatedAt: serverTimestamp(),
      });
    } else if (data.type === "expense" && data.accountId) {
      const accountRef = userDoc(userId, "accounts", data.accountId);
      batch.update(accountRef, {
        balance: increment(-data.amount),
        updatedAt: serverTimestamp(),
      });
    } else if (data.type === "card_purchase" && data.cardId) {
      const cardRef = userDoc(userId, "cards", data.cardId);
      batch.update(cardRef, {
        pendingBills: increment(data.amount),
        updatedAt: serverTimestamp(),
      });
    }

    // 4. Create the main transaction
    const newDocRef = userDoc<Transaction>(userId, "transactions", crypto.randomUUID());
    batch.set(newDocRef, {
      ...data,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });

    await batch.commit();
  },

  async createMonthTransfer(
    userId: string,
    sourceMonth: { month: number; year: number; monthYear: string },
    destMonth: { month: number; year: number; monthYear: string },
    amount: number,
    description: string,
    date: Date
  ): Promise<void> {
    const batch = writeBatch(db);

    const sourceId = crypto.randomUUID();
    const destId = crypto.randomUUID();

    const sourceRef = userDoc<Transaction>(userId, "transactions", sourceId);
    const destRef = userDoc<Transaction>(userId, "transactions", destId);

    batch.set(sourceRef, {
      date,
      referenceMonthYear: sourceMonth.monthYear,
      type: "month_transfer_out",
      amount,
      description,
      status: "paid",
      relatedTransactionId: destId,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });

    batch.set(destRef, {
      date,
      referenceMonthYear: destMonth.monthYear,
      type: "month_transfer_in",
      amount,
      description,
      status: "paid",
      relatedTransactionId: sourceId,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });

    await batch.commit();
  },

  /**
   * Cria uma transferência de saldo de um mês para um objetivo.
   * Não afeta saldo de contas. Afeta o saldo livre do mês de origem.
   * Se houver envelopeId, materializa o monthPlan (snapshot do envelope).
   */
  async createGoalTransfer(
    userId: string,
    params: {
      referenceMonthYear: string;
      goalId: string;
      amount: number;
      description: string;
      envelopeId?: string;
      date: Date;
    }
  ): Promise<void> {
    if (params.envelopeId) {
      const [refYear, refMonth] = params.referenceMonthYear.split("-").map(Number);
      await monthPlanService.ensureMonthPlan(userId, refMonth, refYear);
    }

    const batch = writeBatch(db);
    const newDocRef = userDoc<Transaction>(userId, "transactions", crypto.randomUUID());
    batch.set(newDocRef, {
      date: params.date,
      referenceMonthYear: params.referenceMonthYear,
      type: "goal_transfer",
      amount: params.amount,
      description: params.description,
      goalId: params.goalId,
      ...(params.envelopeId ? { envelopeId: params.envelopeId } : {}),
      status: "paid",
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    } as any);
    await batch.commit();
  },

  /**
   * Cria um saque de um objetivo para um mês.
   * Não afeta saldo de contas. Aumenta o saldo livre do mês de destino.
   * Valida que o valor não excede o saldo atual do objetivo.
   */
  async createGoalWithdraw(
    userId: string,
    params: {
      referenceMonthYear: string;
      goalId: string;
      amount: number;
      description: string;
      date: Date;
      currentGoalBalance: number; // Validado antes de chamar
    }
  ): Promise<void> {
    if (params.amount > params.currentGoalBalance) {
      throw new Error(
        `O valor do saque (${params.amount}) excede o saldo atual do objetivo (${params.currentGoalBalance}).`
      );
    }

    const batch = writeBatch(db);
    const newDocRef = userDoc<Transaction>(userId, "transactions", crypto.randomUUID());
    batch.set(newDocRef, {
      date: params.date,
      referenceMonthYear: params.referenceMonthYear,
      type: "goal_withdraw",
      amount: params.amount,
      description: params.description,
      goalId: params.goalId,
      status: "paid",
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    } as any);
    await batch.commit();
  },

  async deleteTransaction(
    userId: string,
    transactionId: string
  ): Promise<void> {
    const docRef = userDoc<Transaction>(userId, "transactions", transactionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    
    // Bloqueia deleção de transações amarradas a um pagamento de fatura
    if (data.billPaymentId) {
      throw new Error("Esta transação está vinculada a um pagamento de fatura. Exclua o pagamento da fatura primeiro.");
    }

    const batch = writeBatch(db);

    batch.delete(docRef);

    // Revert account balance or card pendingBills based on transaction type
    if (data.type === "income" && data.accountId) {
      // Reverse income: subtract from account
      const accountRef = userDoc(userId, "accounts", data.accountId);
      batch.update(accountRef, {
        balance: increment(-data.amount),
        updatedAt: serverTimestamp(),
      });
    } else if (data.type === "expense" && data.accountId) {
      // Reverse expense: add back to account
      const accountRef = userDoc(userId, "accounts", data.accountId);
      batch.update(accountRef, {
        balance: increment(data.amount),
        updatedAt: serverTimestamp(),
      });
    } else if (data.type === "card_purchase" && data.status === "pending" && data.cardId) {
      // Reverse pending purchase: subtract from card pendingBills
      const cardRef = userDoc(userId, "cards", data.cardId);
      batch.update(cardRef, {
        pendingBills: increment(-data.amount),
        updatedAt: serverTimestamp(),
      });
    } else if (data.type === "card_purchase" && data.status === "reversed" && data.cardId) {
      // Reverse reversed purchase: This should not happen anymore via UI directly since they are linked.
      // But if it was unlinked somehow (e.g. cancelled), wait, if it's cancelled, it won't hit here.
      // Actually, reversed items have a billPaymentId, so they are blocked above.
      // We keep this just for data consistency in case it's called internally.
      const cardRef = userDoc(userId, "cards", data.cardId);
      batch.update(cardRef, {
        pendingBills: increment(data.amount),
        updatedAt: serverTimestamp(),
      });
    } else if (data.type === "card_purchase" && data.status === "cancelled") {
      // Deleting a cancelled transaction has ZERO effect on pendingBills.
      // No updates needed.
    } else if (data.type === "bill_payment") {
      // Reverse bill_payment:
      // 1. Add back to account balance
      if (data.accountId) {
        const accountRef = userDoc(userId, "accounts", data.accountId);
        batch.update(accountRef, {
          balance: increment(data.amount),
          updatedAt: serverTimestamp(),
        });
      }

      // 2. Revert card_purchases linked to this bill_payment back to pending
      if (data.cardId) {
        const colRef = userCol<Transaction>(userId, "transactions");
        const linkedQuery = query(
          colRef,
          where("billPaymentId", "==", transactionId),
          where("cardId", "==", data.cardId)
        );
        const linkedSnap = await getDocs(linkedQuery);

        let totalLinkedAmount = 0;
        linkedSnap.docs.forEach((docSnap) => {
          const tData = docSnap.data();
          totalLinkedAmount += tData.amount || 0;

          if (tData.status === "paid") {
            batch.update(docSnap.ref, {
              status: "pending",
              billPaymentId: null,
              updatedAt: serverTimestamp(),
            });
          } else if (tData.status === "reversed") {
            batch.update(docSnap.ref, {
              status: "cancelled", // Mudar para cancelado
              billPaymentId: null,
              updatedAt: serverTimestamp(),
            });
          }
        });

        // Increment pendingBills by the original reduction amount
        const amountToAddBack = data.appliedReduction !== undefined
          ? data.appliedReduction
          : Math.min(data.amount, totalLinkedAmount); // Fallback para transações antigas

        if (amountToAddBack !== 0) {
          const cardRef = userDoc(userId, "cards", data.cardId);
          batch.update(cardRef, {
            pendingBills: increment(amountToAddBack),
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    // If it's a month transfer, delete the paired transaction
    if (
      (data.type === "month_transfer_in" || data.type === "month_transfer_out") &&
      data.relatedTransactionId
    ) {
      const relatedRef = userDoc<Transaction>(userId, "transactions", data.relatedTransactionId);
      batch.delete(relatedRef);
    }

    // goal_transfer and goal_withdraw: no account/card balance changes needed.
    // The goal balance and month balance are derived from the transaction sum,
    // so simply deleting the document is sufficient — no incremental reversal required.

    await batch.commit();
  },

  /**
   * Estorna uma card_purchase já paga.
   * Marca como "reversed", atualiza a descrição e cria crédito no card.pendingBills.
   */
  async reverseTransaction(
    userId: string,
    transactionId: string
  ): Promise<void> {
    const docRef = userDoc<Transaction>(userId, "transactions", transactionId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.type !== "card_purchase" || data.status !== "paid") {
      throw new Error("Só é possível estornar card_purchase com status paid.");
    }

    const batch = writeBatch(db);

    // Mark transaction as reversed
    batch.update(docRef, {
      status: "reversed",
      updatedAt: serverTimestamp(),
    });

    // Decrement pendingBills on the card (can go negative = credit)
    if (data.cardId) {
      const cardRef = userDoc(userId, "cards", data.cardId);
      batch.update(cardRef, {
        pendingBills: increment(-data.amount),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  /**
   * Cria uma compra parcelada no cartão.
   * Gera N transações card_purchase (uma por parcela) em um único batch.
   * Cada parcela tem referenceMonthYear e invoiceMonthYear incrementados.
   * pendingBills é incrementado uma única vez com o valor total.
   */
  async createInstallmentPurchase(
    userId: string,
    data: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
    installments: number
  ): Promise<void> {
    if (installments < 2 || installments > 12) {
      throw new Error("Número de parcelas deve ser entre 2 e 12.");
    }
    if (!data.cardId) {
      throw new Error("Cartão é obrigatório para compra parcelada.");
    }

    const totalAmount = data.amount;
    const parcelValue = Math.floor((totalAmount * 100) / installments) / 100;
    const lastParcelValue = Number(
      (totalAmount - parcelValue * (installments - 1)).toFixed(2)
    );

    const installmentId = crypto.randomUUID();
    const colRef = userCol<Transaction>(userId, "transactions");

    // Pre-validate: check if any invoice month is already paid
    const baseRefMonthYear = data.referenceMonthYear;
    const baseInvMonthYear = data.invoiceMonthYear!;

    for (let i = 0; i < installments; i++) {
      const refMY = addMonths(baseRefMonthYear, i);
      const invMY = addMonths(baseInvMonthYear, i);

      // Check if bill already paid for this invoice month
      const qBill = query(
        colRef,
        where("type", "==", "bill_payment"),
        where("cardId", "==", data.cardId),
        where("invoiceMonthYear", "==", invMY)
      );
      const snapBill = await getDocs(qBill);
      if (!snapBill.empty) {
        const [invYear, invMonth] = invMY.split("-").map(Number);
        const monthName = new Date(2000, invMonth - 1, 1).toLocaleString(
          "pt-BR",
          { month: "long" }
        );
        throw new Error(
          `A fatura de ${monthName}/${invYear} já foi paga. Não é possível lançar parcelas neste mês.`
        );
      }

      // Ensure month plan for each parcel month
      const [refYear, refMonth] = refMY.split("-").map(Number);
      await monthPlanService.ensureMonthPlan(userId, refMonth, refYear);
    }

    // Build the batch
    const batch = writeBatch(db);

    for (let i = 0; i < installments; i++) {
      const refMY = addMonths(baseRefMonthYear, i);
      const invMY = addMonths(baseInvMonthYear, i);
      const amount = i === installments - 1 ? lastParcelValue : parcelValue;
      const description = `${data.description} (${i + 1}/${installments})`;

      const docRef = userDoc<Transaction>(
        userId,
        "transactions",
        crypto.randomUUID()
      );
      batch.set(docRef, {
        ...data,
        amount,
        description,
        referenceMonthYear: refMY,
        invoiceMonthYear: invMY,
        installmentId,
        status: "pending",
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      });
    }

    // Single increment for total amount on card pendingBills
    const cardRef = userDoc(userId, "cards", data.cardId);
    batch.update(cardRef, {
      pendingBills: increment(totalAmount),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  },

  /**
   * Estorna um grupo de parcelas.
   * Parcelas paid → marcadas como reversed (crédito no pendingBills).
   * Parcelas pending → deletadas (decremento do pendingBills).
   * Parcelas reversed/cancelled → ignoradas.
   */
  async reverseInstallmentGroup(
    userId: string,
    installmentId: string
  ): Promise<void> {
    const colRef = userCol<Transaction>(userId, "transactions");
    const q = query(colRef, where("installmentId", "==", installmentId));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Nenhuma parcela encontrada para este parcelamento.");
    }

    const batch = writeBatch(db);
    let totalToDecrement = 0;
    let cardId: string | undefined;

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!cardId) cardId = data.cardId;

      if (data.status === "paid") {
        batch.update(docSnap.ref, {
          status: "reversed",
          updatedAt: serverTimestamp(),
        });
        totalToDecrement += data.amount;
      } else if (data.status === "pending") {
        batch.delete(docSnap.ref);
        totalToDecrement += data.amount;
      }
      // reversed / cancelled → skip
    });

    if (cardId && totalToDecrement > 0) {
      const cardRef = userDoc(userId, "cards", cardId);
      batch.update(cardRef, {
        pendingBills: increment(-totalToDecrement),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },

  /**
   * Deleta todas as parcelas de um grupo (apenas quando todas estão pending).
   * Se alguma parcela estiver paid, lança erro orientando o uso de estorno.
   */
  async deleteInstallmentGroup(
    userId: string,
    installmentId: string
  ): Promise<void> {
    const colRef = userCol<Transaction>(userId, "transactions");
    const q = query(colRef, where("installmentId", "==", installmentId));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("Nenhuma parcela encontrada para este parcelamento.");
    }

    // Validate all are pending
    const hasPaid = snap.docs.some((docSnap) => {
      const status = docSnap.data().status;
      return status === "paid";
    });

    if (hasPaid) {
      throw new Error(
        "Existem parcelas já pagas neste parcelamento. Utilize o estorno para reverter."
      );
    }

    const batch = writeBatch(db);
    let totalToDecrement = 0;
    let cardId: string | undefined;

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!cardId) cardId = data.cardId;

      if (data.status === "pending") {
        batch.delete(docSnap.ref);
        totalToDecrement += data.amount;
      }
      // cancelled → just delete, no pendingBills impact
      if (data.status === "cancelled") {
        batch.delete(docSnap.ref);
      }
    });

    if (cardId && totalToDecrement > 0) {
      const cardRef = userDoc(userId, "cards", cardId);
      batch.update(cardRef, {
        pendingBills: increment(-totalToDecrement),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },
};

/**
 * Helper: incrementa um "YYYY-MM" por N meses.
 */
function addMonths(monthYear: string, n: number): string {
  const [year, month] = monthYear.split("-").map(Number);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
