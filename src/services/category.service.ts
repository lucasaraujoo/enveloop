import { userCol, userDoc } from "@/lib/firestore";
import { Category } from "@/types/category.types";
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export const categoryService = {
  async getCategories(userId: string): Promise<Category[]> {
    const q = query(userCol<Category>(userId, "categories"));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  async createCategory(userId: string, data: Omit<Category, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const colRef = userCol<Category>(userId, "categories");
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    });
    return docRef.id;
  },

  async updateCategory(userId: string, categoryId: string, data: Partial<Category>): Promise<void> {
    const docRef = userDoc<Category>(userId, "categories", categoryId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp() as any,
    });
  },

  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    const docRef = userDoc<Category>(userId, "categories", categoryId);
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp() as any,
    });
  },

  async restoreCategory(userId: string, categoryId: string): Promise<void> {
    const docRef = userDoc<Category>(userId, "categories", categoryId);
    await updateDoc(docRef, {
      active: true,
      updatedAt: serverTimestamp() as any,
    });
  },
};
