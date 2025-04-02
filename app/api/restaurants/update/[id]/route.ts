import { NextResponse } from "next/server";
import { posAdminDb, posAdminAuth } from "@/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
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
    } = body;

    if (!posAdminDb || !posAdminAuth) {
      throw new Error("Firebase Admin not initialized");
    }

    const restaurantRef = posAdminDb.doc(`restaurants/${id}`);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (address !== undefined) updateData.address = address;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (activationToken !== undefined) updateData.activationToken = activationToken;
    if (tokenActivationDate !== undefined) {
      updateData.tokenActivationDate = Timestamp.fromDate(new Date(tokenActivationDate));
    }
    if (tokenExpiresAt !== undefined) {
      updateData.tokenExpiresAt = Timestamp.fromDate(new Date(tokenExpiresAt));
    }
    // Always update lastUpdated when any change is made
    if (Object.keys(updateData).length > 0) {
      updateData.lastUpdated = Timestamp.fromDate(new Date());
    }

    // Only update Firestore if there are fields to update
    if (Object.keys(updateData).length > 0) {
      await restaurantRef.update(updateData);
    }

    // Update email in Firebase Auth if provided
    if (email !== undefined) {
      await posAdminAuth.updateUser(id, { email });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating restaurant:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update restaurant" },
      { status: 500 }
    );
  }
}