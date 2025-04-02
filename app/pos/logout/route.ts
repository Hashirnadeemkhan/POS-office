import { NextResponse } from "next/server";
import { posAdminDb } from "@/firebase/admin";
import { Timestamp } from "firebase-admin/firestore"; // Import Timestamp

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers.get("x-session-token") || "";

    if (!sessionToken) {
      return NextResponse.json({ error: "No session token provided" }, { status: 400 });
    }

    // Fetch session document
    const sessionQuery = await posAdminDb
      .collection("restaurantSessions")
      .where("sessionToken", "==", sessionToken)
      .get();

    if (sessionQuery.empty) {
      return NextResponse.json({ error: "Invalid or no session found" }, { status: 401 });
    }

    const sessionDoc = sessionQuery.docs[0];
    const sessionData = sessionDoc.data();
    const userId = sessionDoc.id;

    // Handle Firestore Timestamp for expiresAt
    const expiresAt = sessionData.expiresAt instanceof Timestamp 
      ? sessionData.expiresAt.toMillis() 
      : sessionData.expiresAt;
    const currentTime = Date.now();

    if (expiresAt && currentTime > expiresAt) {
      await posAdminDb.collection("restaurantSessions").doc(userId).delete();
      return NextResponse.json({ error: "Session expired, logged out" }, { status: 401 });
    }

    // Delete the session for logout
    await posAdminDb.collection("restaurantSessions").doc(userId).delete();
    return NextResponse.json({ success: true, message: "Restaurant logout successful" }, { status: 200 });
  } catch (error: any) {
    console.error("POS Logout Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during logout" },
      { status: 500 }
    );
  }
}