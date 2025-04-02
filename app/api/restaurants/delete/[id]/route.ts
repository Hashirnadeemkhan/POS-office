// /api/restaurants/delete/[id]/route.ts
import { posAdminDb, posAdminAuth } from "@/firebase/admin";
import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!posAdminDb || !posAdminAuth) {
      throw new Error("Firebase Admin not initialized");
    }

    await posAdminDb.doc(`restaurants/${id}`).delete();
    await posAdminAuth.deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting restaurant:", error);
    return NextResponse.json({ error: "Failed to delete restaurant" }, { status: 500 });
  }
}