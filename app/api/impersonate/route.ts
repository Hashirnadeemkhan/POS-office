// import { type NextRequest, NextResponse } from "next/server";
// import { posAdminDb, adminAdminAuth, adminAdminDb } from "@/firebase/admin";

// export async function POST(req: NextRequest) {
//   try {
//     console.log("POST /api/impersonate: Received request");

//     const { restaurantId } = await req.json();
//     console.log("POST /api/impersonate: Parsed restaurantId:", restaurantId);
//     if (!restaurantId || typeof restaurantId !== "string") {
//       console.log("POST /api/impersonate: Invalid restaurant ID");
//       return NextResponse.json({ error: "Invalid restaurant ID" }, { status: 400 });
//     }

//     const authHeader = req.headers.get("Authorization");
//     console.log("POST /api/impersonate: Authorization header:", authHeader);
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       console.log("POST /api/impersonate: Missing or invalid Authorization header");
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const token = authHeader.split(" ")[1];
//     console.log("POST /api/impersonate: Extracted token:", token);

//     try {
//       const decodedToken = await adminAdminAuth.verifyIdToken(token);
//       console.log("POST /api/impersonate: Decoded token UID:", decodedToken.uid);

//       const adminDocRef = adminAdminDb.collection("adminUsers").doc(decodedToken.uid);
//       const adminDoc = await adminDocRef.get();
//       console.log("POST /api/impersonate: Admin doc exists:", adminDoc.exists, "Data:", adminDoc.data());

//       if (!adminDoc.exists) {
//         console.log("POST /api/impersonate: No admin document found for UID:", decodedToken.uid);
//         return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
//       }

//       const role = adminDoc.data()?.role;
//       console.log("POST /api/impersonate: User role:", role);

//       if (!["admin", "superadmin"].includes(role)) {
//         console.log("POST /api/impersonate: User role is not admin or superadmin:", role);
//         return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
//       }

//       const restaurantDocRef = posAdminDb.collection("restaurants").doc(restaurantId);
//       const restaurantDoc = await restaurantDocRef.get();
//       console.log("POST /api/impersonate: Restaurant doc exists:", restaurantDoc.exists);

//       if (!restaurantDoc.exists) {
//         console.log("POST /api/impersonate: Restaurant does not exist:", restaurantId);
//         return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
//       }

//       const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
//       console.log("POST /api/impersonate: Generated sessionToken:", sessionToken);

//       const sessionDocRef = posAdminDb.collection("restaurantSessions").doc(restaurantId);
//       console.log("POST /api/impersonate: Writing to restaurantSessions with data:", {
//         sessionToken,
//         isImpersonation: true,
//         adminId: decodedToken.uid,
//       });

//       await sessionDocRef.set({
//         sessionToken,
//         isImpersonation: true,
//         adminId: decodedToken.uid,
//         createdAt: new Date().toISOString(),
//         expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
//       });

//       console.log("POST /api/impersonate: Successfully wrote to restaurantSessions");

//       const response = NextResponse.json({ sessionToken, restaurantId }, { status: 200 });

//       response.cookies.set({
//         name: "impersonationSessionToken",
//         value: sessionToken,
//         path: "/",
//         maxAge: 60 * 60 * 24,
//         sameSite: "lax",
//         httpOnly: true,
//       });

//       response.cookies.set({
//         name: "impersonationRestaurantId",
//         value: restaurantId,
//         path: "/",
//         maxAge: 60 * 60 * 24,
//         sameSite: "lax",
//         httpOnly: true,
//       });

//       console.log("POST /api/impersonate: Cookies set, returning response");
//       return response;
//     } catch (tokenError) {
//       console.error("POST /api/impersonate: Token verification error:", tokenError);
//       return NextResponse.json({ error: "Invalid token" }, { status: 401 });
//     }
//   } catch (error) {
//     console.error("POST /api/impersonate: Error:", error, "Stack:", error.stack);
//     return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
//   }
// }