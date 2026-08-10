import { userCol, userDoc } from "@/lib/firestore";
import { Card } from "@/types/card.types";
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export const cardService = {
  async getCards(userId: string): Promise<Card[]> {
    const q = query(userCol<Card>(userId, "cards"));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.seconds ?? 0;
        const bTime = (b.createdAt as any)?.seconds ?? 0;
        return aTime - bTime;
      });
  },

  async createCard(userId: string, data: Omit<Card, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const colRef = userCol<Card>(userId, "cards");
    const docRef = await addDoc(colRef, {
      ...data,
      // Initialize pending bills to zero
      pendingBills: 0,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });
    return docRef.id;
  },

  async updateCard(userId: string, cardId: string, data: Partial<Card>): Promise<void> {
    const docRef = userDoc<Card>(userId, "cards", cardId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp() as any,
    });
  },

  async deleteCard(userId: string, cardId: string): Promise<void> {
    const docRef = userDoc<Card>(userId, "cards", cardId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp() as any,
    });
  },

  async restoreCard(userId: string, cardId: string): Promise<void> {
    const docRef = userDoc<Card>(userId, "cards", cardId);
    await updateDoc(docRef, {
      active: true,
      updatedAt: serverTimestamp() as any,
    });
  },
};
