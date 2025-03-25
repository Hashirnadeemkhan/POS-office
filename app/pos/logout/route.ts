import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, deleteDoc } from "firebase/firestore"
import { adminDb } from "@/lib/firebase-admin" // Import Firebase Admin SDK

export async function POST(request: Request) {
  try {
    // Get session token from request headers or cookies
    const sessionToken = request.headers.get("x-session-token") || ""

    // Verify session token using Firebase Admin SDK (optional but recommended)
    const sessionDoc = await adminDb
      .collection("restaurantSessions")
      .where("sessionToken", "==", sessionToken)
      .get()

    if (sessionDoc.empty) {
      return NextResponse.json({ message: "Invalid or no session found" }, { status: 401 })
    }

    const userId = sessionDoc.docs[0].id

    // Delete the session from Firestore
    await deleteDoc(doc(db, "restaurantSessions", userId))

    return NextResponse.json({ message: "Logout successful" }, { status: 200 })
  } catch (error: any) {
    console.error("POS Logout error:", error)
    return NextResponse.json({ message: error.message || "Failed to logout" }, { status: 500 })
  }
}