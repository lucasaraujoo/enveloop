import { Timestamp } from "firebase/firestore";

export interface Goal {
  id?: string;
  name: string;
  targetAmount: number;      // Meta (valor)
  active: boolean;           // Soft Delete — false = excluído, mas transações preservadas
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
