import { Timestamp } from "firebase/firestore";

export interface Envelope {
  id?: string;
  name: string;
  type: "default" | "temporary";
  defaultAmount: number;
  order: number;
  color?: string;
  icon?: string;
  active: boolean;
  targetMonths?: { month: number; year: number }[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
