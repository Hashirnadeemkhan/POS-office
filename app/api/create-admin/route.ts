import { NextResponse } from "next/server";
import { adminAdminAuth, adminAdminDb } from "@/firebase/admin"; // Ensure this is correct
import { FieldValue } from "firebase-admin/firestore"; // Explicitly import FieldValue

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    // Validate inputs
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (!["admin", "superadmin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Create user with Admin SDK
    const userRecord = await adminAdminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Save user data to Firestore using serverTimestamp
    await adminAdminDb.collection("adminUsers").doc(userRecord.uid).set({
      name,
      email,
      role,
      uid: userRecord.uid,
      createdAt: FieldValue.serverTimestamp(), // Use FieldValue.serverTimestamp()
      lastUpdated: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    console.error("Error creating admin:", error);
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create admin" }, { status: 500 });
  }
}