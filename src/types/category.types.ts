import { Timestamp } from "firebase/firestore";

export interface Category {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
  active: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
