// functions/index.ts
import * as functions from "firebase-functions";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize the admin project
const adminServiceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY || "{}");
const adminApp = initializeApp({
  credential: cert(adminServiceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}, "admin-sync");

// Initialize the POS project
const posServiceAccount = JSON.parse(process.env.FIREBASE_POS_SERVICE_ACCOUNT_KEY || "{}");
const posApp = initializeApp({
  credential: cert(posServiceAccount),
  databaseURL: process.env.NEXT_PUBLIC_POS_FIREBASE_DATABASE_URL,
}, "pos-sync");

const adminDb = getFirestore(adminApp);
const posDb = getFirestore(posApp);

// Sync adminUsers from admin project to POS project
export const syncAdminUsersToPos = functions.firestore
  .document("adminUsers/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const posAdminUsersRef = posDb.collection("adminUsers").doc(userId);

    if (!change.after.exists) {
      // Document was deleted in the admin project, delete it in the POS project
      await posAdminUsersRef.delete();
      console.log(`Deleted adminUsers/${userId} in POS project`);
      return;
    }

    // Document was created or updated in the admin project, replicate it to the POS project
    const data = change.after.data();
    await posAdminUsersRef.set({
      role: data.role,
    });
    console.log(`Synced adminUsers/${userId} to POS project with role: ${data.role}`);
  });