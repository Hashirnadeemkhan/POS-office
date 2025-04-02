import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Admin SDK for Admin Project
let adminApp: App;
const adminServiceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY || "{}");

if (!getApps().some(app => app.name === "admin")) {
  adminApp = initializeApp({
    credential: cert(adminServiceAccount),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  }, "admin");
} else {
  adminApp = getApps().find(app => app.name === "admin")!;
}

// Admin SDK for POS Project
let posAdminApp: App;
const posServiceAccount = JSON.parse(process.env.FIREBASE_POS_SERVICE_ACCOUNT_KEY || "{}");

if (!getApps().some(app => app.name === "pos-admin")) {
  posAdminApp = initializeApp({
    credential: cert(posServiceAccount),
    databaseURL: process.env.NEXT_PUBLIC_POS_FIREBASE_DATABASE_URL,
  }, "pos-admin");
} else {
  posAdminApp = getApps().find(app => app.name === "pos-admin")!;
}

export const adminAdminAuth: Auth = getAuth(adminApp);
export const adminAdminDb: Firestore = getFirestore(adminApp);
export const posAdminAuth: Auth = getAuth(posAdminApp);
export const posAdminDb: Firestore = getFirestore(posAdminApp);