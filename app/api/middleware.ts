import { type NextRequest, NextResponse } from "next/server";
import { posAdminDb, adminAdminAuth, adminAdminDb, posAdminAuth } from "@/firebase/admin";

export async function middleware(req: NextRequest) {
  console.log("Middleware: Request URL:", req.url);

  const sessionToken = req.cookies.get("impersonationSessionToken")?.value;
  const restaurantId = req.cookies.get("impersonationRestaurantId")?.value;
  const authHeader = req.headers.get("Authorization");

  console.log("Middleware: Session Token:", sessionToken);
  console.log("Middleware: Restaurant ID:", restaurantId);

  // Check if there's an Authorization header with a token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decodedToken = await posAdminAuth.verifyIdToken(token);
      const uid = decodedToken.uid;

      // Handle impersonation token
      if (decodedToken.isImpersonation) {
        const restaurantDocRef = posAdminDb.collection("restaurants").doc(uid);
        const restaurantDoc = await restaurantDocRef.get();
        if (restaurantDoc.exists && restaurantDoc.data()?.isActive) {
          const requestHeaders = new Headers(req.headers);
          requestHeaders.set("X-Authenticated-Restaurant-Id", uid);
          console.log(" Middleware: Impersonation - Setting X-Authenticated-Restaurant-Id:", uid);
          return NextResponse.next({ request: { headers: requestHeaders } });
        } else {
          console.log("Middleware: Impersonated restaurant is deactivated, redirecting to /pos/login");
          return NextResponse.redirect(new URL("/pos/login", req.url));
        }
      }

      // Check if the user is an admin or superadmin
      const adminDocRef = adminAdminDb.collection("adminUsers").doc(uid);
      const adminDoc = await adminDocRef.get();
      if (adminDoc.exists && ["admin", "superadmin"].includes(adminDoc.data()?.role)) {
        const isAdminOrSuperadmin = true;
        const adminUid = uid;
        console.log("Middleware: User is admin/superadmin, UID:", adminUid);

        if (req.nextUrl.pathname.startsWith("/pos/")) {
          const requestHeaders = new Headers(req.headers);
          if (restaurantId) {
            const restaurantDocRef = posAdminDb.collection("restaurants").doc(restaurantId);
            const restaurantDoc = await restaurantDocRef.get();
            if (restaurantDoc.exists && restaurantDoc.data()?.isActive) {
              requestHeaders.set("X-Authenticated-Restaurant-Id", restaurantId);
              console.log("Middleware: Admin/Superadmin - Setting X-Authenticated-Restaurant-Id:", restaurantId);
            } else {
              console.log("Middleware: Restaurant is deactivated, redirecting to /admin/dashboard");
              return NextResponse.redirect(new URL("/admin/dashboard", req.url));
            }
          }
          requestHeaders.set("X-Authenticated-User-Id", adminUid);
          console.log("Middleware: Admin/Superadmin - Setting X-Authenticated-User-Id:", adminUid);
          return NextResponse.next({ request: { headers: requestHeaders } });
        }
      }

      // Regular restaurant authentication
      const restaurantDocRef = posAdminDb.collection("restaurants").doc(uid);
      const restaurantDoc = await restaurantDocRef.get();
      if (restaurantDoc.exists && restaurantDoc.data()?.isActive) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("X-Authenticated-Restaurant-Id", uid);
        console.log("Middleware: Setting X-Authenticated-Restaurant-Id:", uid);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    } catch (error) {
      console.error("Middleware: Error verifying token:", error);
    }
  }

  // Fallback to cookie-based impersonation if no valid token
  if (sessionToken && restaurantId) {
    try {
      const sessionDocRef = posAdminDb.collection("restaurantSessions").doc(restaurantId);
      const sessionDoc = await sessionDocRef.get();
      console.log("Middleware: Session doc exists:", sessionDoc.exists, "Data:", sessionDoc.data());

      if (sessionDoc.exists && sessionDoc.data()?.sessionToken === sessionToken) {
        const restaurantDocRef = posAdminDb.collection("restaurants").doc(restaurantId);
        const restaurantDoc = await restaurantDocRef.get();
        if (restaurantDoc.exists && restaurantDoc.data()?.isActive) {
          const requestHeaders = new Headers(req.headers);
          requestHeaders.set("X-Authenticated-Restaurant-Id", restaurantId);
          console.log("Middleware: Setting X-Authenticated-Restaurant-Id:", restaurantId);
          return NextResponse.next({ request: { headers: requestHeaders } });
        } else {
          console.log("Middleware: Restaurant is deactivated, redirecting to /pos/login");
          return NextResponse.redirect(new URL("/pos/login", req.url));
        }
      } else {
        console.log("Middleware: Invalid impersonation session - Session doc:", sessionDoc.data());
        if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
          return NextResponse.redirect(new URL("/pos/login", req.url));
        }
      }
    } catch (error) {
      console.error("Middleware: Error validating impersonation session:", error);
      if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
        return NextResponse.redirect(new URL("/pos/login", req.url));
      }
    }
  }

  // Redirect if no valid authentication
  if (
    req.nextUrl.pathname.startsWith("/api/") ||
    (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login"))
  ) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (req.nextUrl.pathname.startsWith("/pos/") && !req.nextUrl.pathname.startsWith("/pos/login")) {
        return NextResponse.redirect(new URL("/pos/login", req.url));
      }
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/pos/:path*"],
};