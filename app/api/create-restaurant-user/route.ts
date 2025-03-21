// app/api/create-restaurant-user/route.ts
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, name, ownerName, activationToken, activationDate, expiryDate } = await req.json();

    // Create the user in Firebase Authentication using Admin SDK
    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    // Store additional restaurant data in Firestore
    await adminDb.collection("restaurants").add({
      name,
      email,
      ownerName,
      activationToken,
      isActive: true,
      uid: userRecord.uid,
      createdAt: new Date(),
      lastUpdated: new Date(),
      tokenCreatedAt: new Date().toISOString(),
      tokenActivationDate: activationDate,
      tokenExpiresAt: expiryDate,
    });

    return NextResponse.json({
      uid: userRecord.uid,
      activationToken,
      activationDate,
      expiryDate,
    });
  } catch (error: any) {
    console.error("Error creating restaurant user:", error);
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email is already in use. Please use a different email." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create restaurant account" },
      { status: 500 }
    );
  }
}