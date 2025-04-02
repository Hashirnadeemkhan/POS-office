// /api/restaurants/update/[id]/route.ts
import { posAdminDb, posAdminAuth } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const {
      name,
      email,
      ownerName,
      address,
      phoneNumber,
      isActive,
      activationToken,
      tokenActivationDate,
      tokenExpiresAt,
    } = await request.json();

    if (!posAdminDb || !posAdminAuth) {
      throw new Error("Firebase Admin not initialized");
    }

    const restaurantRef = posAdminDb.doc(`restaurants/${id}`);
    const updateData: any = {
      name,
      ownerName,
      address,
      phoneNumber,
      isActive,
      activationToken,
      tokenActivationDate: Timestamp.fromDate(new Date(tokenActivationDate)),
      tokenExpiresAt: Timestamp.fromDate(new Date(tokenExpiresAt)),
      lastUpdated: Timestamp.fromDate(new Date()),
    };

    await restaurantRef.update(updateData);

    // Update email in Firebase Auth if changed
    if (email) {
      await posAdminAuth.updateUser(id, { email });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json({ error: "Failed to update restaurant" }, { status: 500 });
  }
}