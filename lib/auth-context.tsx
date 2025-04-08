"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type ReactNode } from "react"; // Added this import
import { onAuthStateChanged, User, getIdToken as getFirebaseIdToken, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { adminAuth, posAuth, adminDb, posDb } from "@/firebase/client";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: "admin" | "superadmin" | "restaurant" | null;
  userId: string | null;
  user: User | null;
  loading: boolean;
  authType: "admin" | "restaurant" | null;
  getIdToken: () => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  user: null,
  loading: true,
  authType: null,
  getIdToken: () => Promise.reject("Auth context not initialized"),
  logout: () => Promise.reject("Auth context not initialized"),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<Omit<AuthContextType, "getIdToken" | "logout">>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
    user: null,
    loading: true,
    authType: null,
  });
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(async () => {
    if (authState.userId) {
      try {
        if (authState.authType === "restaurant") {
          await deleteDoc(doc(posDb, "restaurantSessions", authState.userId));
          localStorage.removeItem("restaurantSessionToken");
          document.cookie = "impersonationSessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "impersonationRestaurantId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        } else if (authState.authType === "admin") {
          await deleteDoc(doc(adminDb, "activeSessions", authState.userId));
          localStorage.removeItem("sessionToken");
        }
        await signOut(authState.authType === "restaurant" ? posAuth : adminAuth);
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          userId: null,
          user: null,
          loading: false,
          authType: null,
        });
        router.push(authState.authType === "restaurant" ? "/pos/login" : "/admin/login");
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  }, [authState.userId, authState.authType, router]);

  const checkImpersonationSession = useCallback(async () => {
    const cookies = document.cookie.split(";").reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split("=");
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);

    const sessionToken = cookies["impersonationSessionToken"];
    const restaurantId = cookies["impersonationRestaurantId"];

    console.log("Checking impersonation session - Session Token:", sessionToken);
    console.log("Checking impersonation session - Restaurant ID:", restaurantId);

    if (sessionToken && restaurantId) {
      try {
        const sessionDoc = await getDoc(doc(posDb, "restaurantSessions", restaurantId));
        if (
          sessionDoc.exists() &&
          sessionDoc.data()?.sessionToken === sessionToken &&
          sessionDoc.data()?.isImpersonation
        ) {
          const restaurantDoc = await getDoc(doc(posDb, "restaurants", restaurantId));
          if (restaurantDoc.exists()) {
            const restaurantData = restaurantDoc.data();
            if (!restaurantData.isActive) {
              console.log("checkImpersonationSession: Restaurant is deactivated, logging out");
              await logout();
              return false;
            }
            setAuthState({
              isAuthenticated: true,
              userRole: "restaurant",
              userId: restaurantId,
              user: null,
              loading: false,
              authType: "restaurant",
            });
            return true;
          }
        }
      } catch (error) {
        console.error("Error checking impersonation session:", error);
      }
    }
    return false;
  }, [logout]);

  useEffect(() => {
    const posUnsubscribe = onAuthStateChanged(posAuth, async (user) => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          if (idTokenResult.claims.isImpersonation) {
            // Impersonation case
            const restaurantId = user.uid;
            const restaurantDoc = await getDoc(doc(posDb, "restaurants", restaurantId));
            if (restaurantDoc.exists() && restaurantDoc.data().isActive) {
              setAuthState({
                isAuthenticated: true,
                userRole: "restaurant",
                userId: restaurantId,
                user,
                loading: false,
                authType: "restaurant",
              });
              return;
            } else {
              await logout();
              return;
            }
          }

          // Regular restaurant authentication
          const restaurantDoc = await getDoc(doc(posDb, "restaurants", user.uid));
          if (restaurantDoc.exists()) {
            const restaurantData = restaurantDoc.data();
            if (!restaurantData.isActive) {
              await logout();
              return;
            }
            setAuthState({
              isAuthenticated: true,
              userRole: "restaurant",
              userId: user.uid,
              user,
              loading: false,
              authType: "restaurant",
            });
            return;
          }
        } catch (error) {
          console.error("Error fetching restaurant data:", error);
        }
      }

      const isImpersonated = await checkImpersonationSession();
      if (isImpersonated) {
        return;
      }

      const adminUnsubscribe = onAuthStateChanged(adminAuth, async (user) => {
        if (user) {
          try {
            const adminDoc = await getDoc(doc(adminDb, "adminUsers", user.uid));
            if (adminDoc.exists()) {
              setAuthState({
                isAuthenticated: true,
                userRole: adminDoc.data().role as "admin" | "superadmin",
                userId: user.uid,
                user,
                loading: false,
                authType: "admin",
              });
              return;
            }
          } catch (error) {
            console.error("Error fetching admin data:", error);
          }
        }

        setAuthState((prev) => ({
          ...prev,
          isAuthenticated: false,
          userRole: null,
          userId: null,
          user: null,
          loading: false,
          authType: null,
        }));
      });

      return () => {
        posUnsubscribe();
        adminUnsubscribe();
      };
    });

    return () => posUnsubscribe();
  }, [logout, checkImpersonationSession]);

  useEffect(() => {
    if (!authState.loading) {
      const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
      const isPosRoute = pathname.startsWith("/pos") && pathname !== "/pos/login";

      if (authState.isAuthenticated) {
        if (pathname === "/admin/login" || pathname === "/pos/login") {
          router.push(authState.authType === "restaurant" ? "/pos/dashboard" : "/admin/dashboard");
        } else if (isAdminRoute && authState.authType === "restaurant") {
          router.push("/pos/dashboard");
        } else if (isPosRoute && authState.authType === "admin") {
          // Allow admin/superadmin to stay on /pos routes
          return;
        }
      } else if (isAdminRoute || (isPosRoute && authState.userRole !== "admin" && authState.userRole !== "superadmin")) {
        router.push(isAdminRoute ? "/admin/login" : "/pos/login");
      }
    }
  }, [authState.isAuthenticated, authState.authType, authState.loading, authState.userRole, pathname, router]);

  const getIdToken = async (): Promise<string> => {
    if (!authState.user) {
      const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = value;
        return acc;
      }, {} as Record<string, string>);
      const sessionToken = cookies["impersonationSessionToken"];
      if (sessionToken) {
        return sessionToken;
      }
      throw new Error("No authenticated user");
    }
    return await getFirebaseIdToken(authState.user);
  };

  if (authState.loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-semibold text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ...authState, getIdToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}