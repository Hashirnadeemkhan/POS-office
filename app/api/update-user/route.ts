import { adminAdminAuth } from "@/firebase/admin"; // Change from posAdminAuth
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email, password } = body;

    if (!uid || typeof uid !== "string" || uid.trim() === "") {
      return NextResponse.json({ error: "User ID (uid) is required and must be a non-empty string" }, { status: 400 });
    }

    if (!adminAdminAuth) {
      throw new Error("Firebase Admin Auth not initialized");
    }

    const updateData: { email?: string; password?: string } = {};
    if (email) {
      if (typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
      updateData.email = email;
    }
    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      updateData.password = password;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields provided to update" }, { status: 400 });
    }

    await adminAdminAuth.updateUser(uid, updateData); // Use adminAdminAuth
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: error.code?.startsWith("auth/") ? 400 : 500 }
    );
  }
}