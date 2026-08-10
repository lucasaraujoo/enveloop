import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export const authService = {
  async register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(auth, email, password);
  },

  async login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async logout(): Promise<void> {
    return signOut(auth);
  },

  async resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(auth, email);
  },
};
