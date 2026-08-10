import { collection, CollectionReference, doc, DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Returns a reference to a user's subcollection.
 * Usage: userCol(uid, "accounts")
 */
export function userCol<T>(userId: string, colName: string): CollectionReference<T> {
  return collection(db, "users", userId, colName) as CollectionReference<T>;
}

/**
 * Returns a reference to a specific document in a user's subcollection.
 * Usage: userDoc(uid, "accounts", accountId)
 */
export function userDoc<T>(userId: string, colName: string, docId: string): DocumentReference<T> {
  return doc(db, "users", userId, colName, docId) as DocumentReference<T>;
}
