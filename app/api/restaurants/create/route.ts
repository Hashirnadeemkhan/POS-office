import { posAdminAuth, posAdminDb } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { generateActivationToken } from "@/lib/utils";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    if (!posAdminAuth || !posAdminDb) {
      throw new Error("Firebase Admin not initialized");
    }

    const { name, email, password, ownerName, address, phoneNumber, activationDate, expiryDate, activationToken } = await request.json();

    if (!name || !email || !password || !ownerName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userRecord = await posAdminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const token = activationToken || generateActivationToken(); // Use provided token or generate one

    // Convert dates to Firestore Timestamps
    const now = new Date();
    const activationDateTimestamp = Timestamp.fromDate(new Date(activationDate));
    const expiryDateTimestamp = Timestamp.fromDate(new Date(expiryDate));
    const currentTimestamp = Timestamp.fromDate(now);

    await posAdminDb.doc(`restaurants/${userRecord.uid}`).set({
      name,
      email,
      ownerName,
      address: address || "",
      phoneNumber: phoneNumber || "",
      isActive: true,
      uid: userRecord.uid,
      createdAt: currentTimestamp,
      lastUpdated: currentTimestamp,
      tokenActivationDate: activationDateTimestamp,
      tokenExpiresAt: expiryDateTimestamp,
      activationToken: token,
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      activationToken: token,
    });
  } catch (error: any) {
    console.error("API Error:", error);

    let errorMessage = "Internal server error";
    let statusCode = 500;

    if (error.code === "auth/email-already-exists") {
      errorMessage = "Email already in use";
      statusCode = 400;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}