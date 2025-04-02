// /api/restaurants/get/route.ts
import { posAdminDb } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request) {
  try {
    if (!posAdminDb) {
      throw new Error("Firebase Admin POS database not initialized");
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");

    const restaurantsRef = posAdminDb.collection("restaurants").orderBy("createdAt", "desc");
    const query = limitParam ? restaurantsRef.limit(parseInt(limitParam) || 3) : restaurantsRef;
    const snapshot = await query.get();

    const restaurantsList = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Safely handle tokenExpiresAt
      let tokenExpiresAt: string | undefined;
      if (data.tokenExpiresAt) {
        if (data.tokenExpiresAt instanceof Timestamp) {
          tokenExpiresAt = data.tokenExpiresAt.toDate().toISOString();
        } else if (data.tokenExpiresAt instanceof Date) {
          tokenExpiresAt = data.tokenExpiresAt.toISOString();
        } else if (typeof data.tokenExpiresAt === "string") {
          tokenExpiresAt = new Date(data.tokenExpiresAt).toISOString();
        } else {
          tokenExpiresAt = undefined; // Fallback if format is unrecognized
        }
      }

      return {
        id: doc.id,
        name: data.name || "",
        email: data.email || "",
        ownerName: data.ownerName || "",
        activationToken: data.activationToken || "",
        isActive: data.isActive || false,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : new Date(data.createdAt).toISOString(),
        lastUpdated: data.lastUpdated instanceof Timestamp
          ? data.lastUpdated.toDate().toISOString()
          : new Date(data.lastUpdated).toISOString(),
        tokenExpiresAt,
      };
    });

    return NextResponse.json({ success: true, restaurants: restaurantsList });
  } catch (error: any) {
    console.error("Error fetching restaurants:", error.message, error.stack);
    return NextResponse.json({ error: error.message || "Failed to fetch restaurants" }, { status: 500 });
  }
}