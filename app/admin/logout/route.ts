import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers.get("x-session-token") || "";

    // Fetch session document using Firebase Admin SDK
    const sessionQuery = await adminDb
      .collection("activeSessions")
      .where("sessionToken", "==", sessionToken)
      .get();

    if (sessionQuery.empty) {
      return NextResponse.json({ message: "Invalid or no session found" }, { status: 401 });
    }

    const sessionDoc = sessionQuery.docs[0];
    const sessionData = sessionDoc.data();
    const userId = sessionDoc.id;

    // Check if session has expired
    const currentTime = new Date().getTime();
    if (sessionData.expiresAt && currentTime > sessionData.expiresAt) {
      await deleteDoc(doc(db, "activeSessions", userId));
      return NextResponse.json({ message: "Session expired, logged out" }, { status: 401 });
    }

    // Manually delete the session (logout)
    await deleteDoc(doc(db, "activeSessions", userId));
    return NextResponse.json({ message: "Admin logout successful" }, { status: 200 });
  } catch (error: any) {
    console.error("Admin Logout error:", error);
    return NextResponse.json({ message: error.message || "Failed to logout" }, { status: 500 });
  }
}