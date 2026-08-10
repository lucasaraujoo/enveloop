import { Timestamp } from "firebase/firestore";

export interface Card {
  id?: string;
  name: string;
  lastDigits?: string; // 4 últimos dígitos (visual)
  color?: string;
  icon?: string;
  pendingBills: number; // Total acumulado de compras pendentes no cartão
  closingDay?: number;
  dueDay?: number;
  active: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
