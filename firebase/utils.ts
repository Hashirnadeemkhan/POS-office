import { Firestore as ClientFirestore } from "firebase/firestore";
import { Firestore as AdminFirestore } from "firebase-admin/firestore";
import { adminDb as clientAdminDb, posDb as clientPosDb } from "./client"; // Client-side DBs
import { adminAdminDb, posAdminDb } from "./admin"; // Admin-side DBs

export function getClientDb(isPosRoute: boolean): ClientFirestore {
  return isPosRoute ? clientPosDb : clientAdminDb;
}

export function getAdminDb(isPosRoute: boolean): AdminFirestore {
  return isPosRoute ? posAdminDb : adminAdminDb;
}

export function generateActivationToken(): string {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}