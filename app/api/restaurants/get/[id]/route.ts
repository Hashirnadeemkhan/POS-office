// /api/restaurants/get/[id]/route.ts
import { posAdminDb } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!posAdminDb) {
      throw new Error("Firebase Admin POS database not initialized");
    }

    const restaurantRef = posAdminDb.doc(`restaurants/${id}`);
    const doc = await restaurantRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const data = doc.data()!; // Non-null assertion since doc.exists is true
    const restaurant = {
      id: doc.id,
      name: data.name || "",
      email: data.email || "",
      ownerName: data.ownerName || "",
      address: data.address || "",
      phoneNumber: data.phoneNumber || "",
      activationToken: data.activationToken || "",
      isActive: data.isActive || false,
      // Add createdAt and lastUpdated, which were missing
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : new Date(data.createdAt || Date.now()).toISOString(),
      lastUpdated: data.lastUpdated instanceof Timestamp
        ? data.lastUpdated.toDate().toISOString()
        : new Date(data.lastUpdated || Date.now()).toISOString(),
      tokenActivationDate: data.tokenActivationDate instanceof Timestamp
        ? data.tokenActivationDate.toDate().toISOString()
        : new Date(data.tokenActivationDate).toISOString(),
      tokenExpiresAt: data.tokenExpiresAt instanceof Timestamp
        ? data.tokenExpiresAt.toDate().toISOString()
        : new Date(data.tokenExpiresAt).toISOString(),
    };

    return NextResponse.json({ success: true, restaurant });
  } catch (error: any) {
    console.error("Error fetching restaurant:", error.message, error.stack);
    return NextResponse.json({ error: error.message || "Failed to fetch restaurant" }, { status: 500 });
  }
}