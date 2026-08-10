import { userCol, userDoc } from "@/lib/firestore";
import { Envelope } from "@/types/envelope.types";
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export const envelopeService = {
  async getEnvelopes(userId: string): Promise<Envelope[]> {
    const q = query(userCol<Envelope>(userId, "envelopes"));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async createEnvelope(userId: string, data: Omit<Envelope, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const colRef = userCol<Envelope>(userId, "envelopes");
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });
    return docRef.id;
  },

  async updateEnvelope(userId: string, envelopeId: string, data: Partial<Envelope>): Promise<void> {
    const docRef = userDoc<Envelope>(userId, "envelopes", envelopeId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp() as any,
    });
  },

  async deleteEnvelope(userId: string, envelopeId: string): Promise<void> {
    const docRef = userDoc<Envelope>(userId, "envelopes", envelopeId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp() as any,
    });
  },

  async restoreEnvelope(userId: string, envelopeId: string): Promise<void> {
    const docRef = userDoc<Envelope>(userId, "envelopes", envelopeId);
    await updateDoc(docRef, {
      active: true,
      updatedAt: serverTimestamp() as any,
    });
  },
};
