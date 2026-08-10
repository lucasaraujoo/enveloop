import { Timestamp } from "firebase/firestore";

export interface MonthPlan {
  id?: string;
  month: number;
  year: number;
  monthYear: string; // "YYYY-MM"
  envelopeLimits: {
    [envelopeId: string]: number;
  };
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
