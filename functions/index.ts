import * as functions from "firebase-functions";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY || "{}");
const app = initializeApp({
  credential: cert(serviceAccount),
});
const auth = getAuth(app);

export const updateAdminPassword = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be authenticated.");
  }

  const adminDoc = await app.firestore().collection("adminUsers").doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data()?.role !== "superadmin") {
    throw new functions.https.HttpsError("permission-denied", "Only superadmins can update passwords.");
  }

  const { adminId, newPassword } = data;
  if (!adminId || !newPassword) {
    throw new functions.https.HttpsError("invalid-argument", "Admin ID and new password are required.");
  }

  try {
    await auth.updateUser(adminId, { password: newPassword });
    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", "Failed to update password: " + error.message);
  }
});