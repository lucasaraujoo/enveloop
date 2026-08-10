import { Timestamp } from "firebase/firestore";

export interface Account {
  id?: string;
  name: string;
  initialBalance: number;
  balance: number;       // Saldo atual = initialBalance + incomes - expenses - bill_payments
  color?: string;
  icon?: string;
  active: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
