import { doc, getDoc, setDoc, getDocs, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { userCol, userDoc } from "@/lib/firestore";
import { MonthPlan } from "@/types/monthPlan.types";
import { Envelope } from "@/types/envelope.types";

export const monthPlanService = {
  /**
   * Garante que o plano do mês existe. Se não existir, cria um snapshot
   * com todos os envelopes ativos naquele momento.
   */
  async ensureMonthPlan(userId: string, month: number, year: number): Promise<void> {
    const monthYear = `${year}-${String(month).padStart(2, "0")}`;
    const planRef = userDoc<MonthPlan>(userId, "monthPlans", monthYear);
    
    const planSnap = await getDoc(planRef);
    
    if (planSnap.exists()) {
      return; // Já existe, não faz nada
    }

    // Busca envelopes ativos para criar o snapshot
    const envelopesRef = userCol<Envelope>(userId, "envelopes");
    const q = query(envelopesRef, where("active", "==", true));
    const envelopesSnap = await getDocs(q);
    
    const envelopeLimits: Record<string, number> = {};
    envelopesSnap.forEach((doc) => {
      const env = doc.data();
      // Se for padrão, entra. Se for temporário, verifica se este mês está nos targets
      if (env.type === "default") {
        envelopeLimits[doc.id] = env.defaultAmount;
      } else if (env.type === "temporary" && env.targetMonths) {
        const isTarget = env.targetMonths.some(t => t.month === month && t.year === year);
        if (isTarget) {
          envelopeLimits[doc.id] = env.defaultAmount;
        }
      }
    });

    const newPlan: MonthPlan = {
      month,
      year,
      monthYear,
      envelopeLimits,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(planRef, newPlan);
  },

  async getMonthPlan(userId: string, monthYear: string): Promise<MonthPlan | null> {
    const planRef = userDoc<MonthPlan>(userId, "monthPlans", monthYear);
    const snap = await getDoc(planRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async updateEnvelopeLimit(userId: string, month: number, year: number, envelopeId: string, limit: number): Promise<void> {
    await this.ensureMonthPlan(userId, month, year);
    const monthYear = `${year}-${String(month).padStart(2, "0")}`;
    const planRef = userDoc<MonthPlan>(userId, "monthPlans", monthYear);
    
    await updateDoc(planRef, {
      [`envelopeLimits.${envelopeId}`]: limit,
      updatedAt: serverTimestamp() as any,
    });
  }
};
