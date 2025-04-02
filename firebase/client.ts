import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore, Firestore as ClientFirestore } from "firebase/firestore";
import { adminFirebaseConfig } from "./config/adminConfig";
import { posFirebaseConfig } from "./config/posConfig";

// Admin Client App
const adminApp = getApps().some(app => app.name === "admin")
  ? getApps().find(app => app.name === "admin")!
  : initializeApp(adminFirebaseConfig, "admin");

const adminAuth = getAuth(adminApp);
const adminDb: ClientFirestore = getFirestore(adminApp); // Client-side Firestore

// POS Client App
const posApp = getApps().some(app => app.name === "pos")
  ? getApps().find(app => app.name === "pos")!
  : initializeApp(posFirebaseConfig, "pos");

const posAuth = initializeAuth(posApp, {
  persistence: browserLocalPersistence,
});
const posDb: ClientFirestore = getFirestore(posApp); // Client-side Firestore

export { 
  adminApp,
  adminAuth,
  adminDb,
  posApp,
  posAuth,
  posDb 
};