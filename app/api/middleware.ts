// import { type NextRequest, NextResponse } from "next/server";
// import { posAdminDb, adminAdminAuth, adminAdminDb } from "@/firebase/admin";

// export async function middleware(req: NextRequest) {
//   console.log("Middleware: Request URL:", req.url);

//   // Allow unauthenticated access to /pos/dashboard
//   if (req.nextUrl.pathname === "/pos/dashboard") {
//     console.log("Middleware: Allowing access to /pos/dashboard without authentication");
//     return NextResponse.next();
//   }

//   const sessionToken = req.cookies.get("impersonationSessionToken")?.value;
//   const restaurantId = req.cookies.get("impersonationRestaurantId")?.value;

//   console.log("Middleware: Session Token:", sessionToken);
//   console.log("Middleware: Restaurant ID:", restaurantId);

//   if (sessionToken && restaurantId) {
//     try {
//       const sessionDocRef = posAdminDb.collection("restaurantSessions").doc(restaurantId);
//       const sessionDoc = await sessionDocRef.get();
//       console.log("Middleware: Session doc exists:", sessionDoc.exists, "Data:", sessionDoc.data());

//       if (sessionDoc.exists && sessionDoc.data()?.sessionToken === sessionToken) {
//         const requestHeaders = new Headers(req.headers);
//         requestHeaders.set("X-Authenticated-Restaurant-Id", restaurantId);
//         console.log("Middleware: Setting X-Authenticated-Restaurant-Id:", restaurantId);

//         return NextResponse.next({
//           request: { headers: requestHeaders },
//         });
//       } else {
//         console.log("Middleware: Invalid impersonation session - Session doc:", sessionDoc.data());
//         if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
//           return NextResponse.redirect(new URL("/pos/login", req.url));
//         }
//       }
//     } catch (error) {
//       console.error("Middleware: Error validating impersonation session:", error);
//       if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
//         return NextResponse.redirect(new URL("/pos/login", req.url));
//       }
//     }
//   }

//   const authHeader = req.headers.get("Authorization");
//   if (authHeader && authHeader.startsWith("Bearer ")) {
//     const token = authHeader.split(" ")[1];
//     try {
//       const decodedToken = await adminAdminAuth.verifyIdToken(token);
//       const adminDocRef = adminAdminDb.collection("adminUsers").doc(decodedToken.uid);
//       const adminDoc = await adminDocRef.get();

//       if (adminDoc.exists && ["admin", "superadmin"].includes(adminDoc.data()?.role)) {
//         const requestHeaders = new Headers(req.headers);
//         if (restaurantId) {
//           requestHeaders.set("X-Authenticated-Restaurant-Id", restaurantId);
//           console.log("Middleware: Admin bypass - Setting X-Authenticated-Restaurant-Id:", restaurantId);
//         }
//         requestHeaders.set("X-Authenticated-User-Id", decodedToken.uid);
//         console.log("Middleware: Setting X-Authenticated-User-Id:", decodedToken.uid);

//         return NextResponse.next({
//           request: { headers: requestHeaders },
//         });
//       }
//     } catch (error) {
//       console.error("Middleware: Error verifying admin token:", error);
//     }
//   }

//   if (
//     req.nextUrl.pathname.startsWith("/api/") ||
//     (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login"))
//   ) {
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
//         return NextResponse.redirect(new URL("/pos/login", req.url));
//       }
//       if (req.nextUrl.pathname.startsWith("/api/")) {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//       }
//     }

//     try {
//       const token = authHeader.split(" ")[1];
//       const decodedToken = await adminAdminAuth.verifyIdToken(token);
//       const uid = decodedToken.uid;

//       const requestHeaders = new Headers(req.headers);
//       requestHeaders.set("X-Authenticated-User-Id", uid);
//       console.log("Middleware: Setting X-Authenticated-User-Id:", uid);

//       return NextResponse.next({
//         request: { headers: requestHeaders },
//       });
//     } catch (error) {
//       console.error("Middleware: Error verifying token:", error);
//       if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
//         return NextResponse.redirect(new URL("/pos/login", req.url));
//       }
//       if (req.nextUrl.pathname.startsWith("/api/")) {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//       }
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/api/:path*", "/pos/:path*"],
// };