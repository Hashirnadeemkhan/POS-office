// lib/firebase-admin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Load the service account key
const serviceAccount = require("../config/serviceAccountKey.json");
console.log("Service Account:", serviceAccount); // Debug log

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://pos-office-96be6-default-rtdb.firebaseio.com",
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();