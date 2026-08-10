import { userCol, userDoc } from "@/lib/firestore";
import { Goal } from "@/types/goal.types";
import { Transaction } from "@/types/transaction.types";
import {
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const goalService = {
  /**
   * Retorna todos os objetivos ativos do usuário.
   */
  async getGoals(userId: string): Promise<Goal[]> {
    const col = userCol<Goal>(userId, "goals");
    const q = query(col);
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.seconds ?? 0;
        const bTime = (b.createdAt as any)?.seconds ?? 0;
        return aTime - bTime;
      });
  },

  /**
   * Cria um novo objetivo.
   */
  async createGoal(
    userId: string,
    data: Pick<Goal, "name" | "targetAmount">
  ): Promise<void> {
    const col = userCol<Goal>(userId, "goals");
    const newDocRef = userDoc<Goal>(userId, "goals", crypto.randomUUID());
    const batch = writeBatch(db);
    batch.set(newDocRef, {
      ...data,
      active: true,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });
    await batch.commit();
  },

  /**
   * Atualiza nome e/ou meta de um objetivo existente.
   */
  async updateGoal(
    userId: string,
    goalId: string,
    data: Partial<Pick<Goal, "name" | "targetAmount">>
  ): Promise<void> {
    const docRef = userDoc<Goal>(userId, "goals", goalId);
    const batch = writeBatch(db);
    batch.update(docRef, {
      ...data,
      updatedAt: serverTimestamp() as any,
    });
    await batch.commit();
  },

  /**
   * Calcula o saldo atual de um objetivo a partir de suas transações.
   * saldo = Σ(goal_transfer) - Σ(goal_withdraw)
   */
  calcBalance(goalId: string, transactions: Transaction[]): number {
    return transactions
      .filter((t) => t.goalId === goalId)
      .reduce((sum, t) => {
        if (t.type === "goal_transfer") return sum + (t.amount || 0);
        if (t.type === "goal_withdraw") return sum - (t.amount || 0);
        return sum;
      }, 0);
  },

  /**
   * Exclui um objetivo.
   *
   * strategy:
   *  - "hard": deleta fisicamente todas as transações vinculadas e o objetivo.
   *  - "soft": preserva as transações; apenas inativa o objetivo (active: false).
   *            Se createWithdraw === true, cria uma goal_withdraw para o mês atual antes.
   */
  async deleteGoal(
    userId: string,
    goalId: string,
    strategy: "hard" | "soft",
    options?: {
      createWithdraw?: boolean;
      withdrawAmount?: number;
      withdrawMonthYear?: string;
      withdrawDate?: Date;
    }
  ): Promise<void> {
    const colRef = userCol<Transaction>(userId, "transactions");
    const q = query(colRef, where("goalId", "==", goalId));
    const txSnap = await getDocs(q);

    const batch = writeBatch(db);
    const goalRef = userDoc<Goal>(userId, "goals", goalId);

    if (strategy === "hard") {
      // Delete all related transactions
      txSnap.docs.forEach((doc) => batch.delete(doc.ref));
      // Delete the goal document itself
      batch.delete(goalRef);
    } else {
      // "soft" strategy — preserve transactions
      if (
        options?.createWithdraw &&
        options.withdrawAmount &&
        options.withdrawAmount > 0 &&
        options.withdrawMonthYear
      ) {
        // Create a goal_withdraw for the current month to return the remaining balance
        const withdrawRef = userDoc<Transaction>(
          userId,
          "transactions",
          crypto.randomUUID()
        );
        batch.set(withdrawRef, {
          date: options.withdrawDate ?? new Date(),
          referenceMonthYear: options.withdrawMonthYear,
          type: "goal_withdraw",
          amount: options.withdrawAmount,
          description: "Saque automático ao excluir objetivo",
          goalId,
          status: "paid",
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        } as any);
      }
      // Soft delete the goal
      batch.update(goalRef, {
        active: false,
        updatedAt: serverTimestamp() as any,
      });
    }

    await batch.commit();
  },
};
