import { userCol, userDoc } from "@/lib/firestore";
import { Account } from "@/types/account.types";
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const accountService = {
  async getAccounts(userId: string): Promise<Account[]> {
    const q = query(userCol<Account>(userId, "accounts"));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.seconds ?? 0;
        const bTime = (b.createdAt as any)?.seconds ?? 0;
        return aTime - bTime;
      });
  },

  async createAccount(userId: string, data: Omit<Account, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const colRef = userCol<Account>(userId, "accounts");
    const docRef = await addDoc(colRef, {
      ...data,
      // Initialize balance equal to initialBalance
      balance: data.initialBalance,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });
    return docRef.id;
  },

  async updateAccount(
    userId: string,
    accountId: string,
    data: Partial<Account> & { previousInitialBalance?: number }
  ): Promise<void> {
    const { previousInitialBalance, ...rest } = data;
    const docRef = userDoc<Account>(userId, "accounts", accountId);

    const updateData: Record<string, any> = {
      ...rest,
      updatedAt: serverTimestamp(),
    };

    // If initialBalance changed, apply delta to balance atomically
    if (
      rest.initialBalance !== undefined &&
      previousInitialBalance !== undefined &&
      rest.initialBalance !== previousInitialBalance
    ) {
      const delta = rest.initialBalance - previousInitialBalance;
      updateData.balance = increment(delta);
    }

    await updateDoc(docRef, updateData);
  },

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    // Soft delete
    const docRef = userDoc<Account>(userId, "accounts", accountId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp() as any,
    });
  },

  async restoreAccount(userId: string, accountId: string): Promise<void> {
    const docRef = userDoc<Account>(userId, "accounts", accountId);
    await updateDoc(docRef, {
      active: true,
      updatedAt: serverTimestamp() as any,
    });
  },

  async transferBetweenAccounts(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<void> {
    if (fromAccountId === toAccountId) {
      throw new Error("A conta de origem e destino devem ser diferentes.");
    }
    if (amount <= 0) {
      throw new Error("O valor da transferência deve ser maior que zero.");
    }

    const fromRef = userDoc<Account>(userId, "accounts", fromAccountId);
    const toRef = userDoc<Account>(userId, "accounts", toAccountId);

    const batch = writeBatch(db);
    batch.update(fromRef, {
      balance: increment(-amount),
      updatedAt: serverTimestamp(),
    });
    batch.update(toRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  },
};
