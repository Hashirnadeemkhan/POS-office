// /api/restaurant/logout-by-id/[id]/route.ts
import { NextResponse } from "next/server";
import { posAdminDb } from "@/firebase/admin";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const idToken = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = params.id;
    await posAdminDb.collection("restaurantSessions").doc(userId).delete();
    return NextResponse.json({ success: true, message: "Session terminated" }, { status: 200 });
  } catch (error: any) {
    console.error("Force Logout Error:", error);
    return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 });
  }
}