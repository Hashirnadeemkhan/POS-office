// app/api/update-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { uid, email, password, userRole } = await req.json();

    if (!uid || !userRole) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!email && !password) {
      return NextResponse.json({ message: "No updates provided (email or password required)" }, { status: 400 });
    }

    // Check if the user is updating an admin or restaurant
    const adminDoc = await adminDb.collection("adminUsers").doc(uid).get();
    const isAdminUser = adminDoc.exists;

    if (isAdminUser) {
      // Only superadmin can update admin profiles
      if (userRole !== "superadmin") {
        return NextResponse.json(
          { message: "Unauthorized: Only superadmins can update admin profiles" },
          { status: 403 }
        );
      }
    } else {
      // Both admin and superadmin can update restaurant profiles
      const restaurantDoc = await adminDb.collection("restaurants").doc(uid).get();
      if (!restaurantDoc.exists) {
        return NextResponse.json({ message: "User or restaurant not found" }, { status: 404 });
      }
      if (!["admin", "superadmin"].includes(userRole)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
      }
    }

    // Prepare update object
    const updateData: { email?: string; password?: string } = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    // Update the user using Firebase Admin SDK
    await adminAuth.updateUser(uid, updateData);

    return NextResponse.json({ message: "User updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ message: error.message || "Failed to update user" }, { status: 500 });
  }
}