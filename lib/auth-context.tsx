// lib/auth-context.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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

  const isPosRoute = pathname.startsWith("/pos");
  const currentAuth = isPosRoute ? posAuth : adminAuth;
  const currentDb = isPosRoute ? posDb : adminDb;

  const logout = useCallback(async () => {
    if (authState.userId) {
      try {
        // Delete the session document based on user type
        if (authState.authType === "restaurant") {
          await deleteDoc(doc(posDb, "restaurantSessions", authState.userId));
          localStorage.removeItem("restaurantSessionToken");
        } else if (authState.authType === "admin") {
          await deleteDoc(doc(adminDb, "activeSessions", authState.userId));
          localStorage.removeItem("sessionToken");
        }

        // Sign out from the appropriate auth service
        await signOut(authState.authType === "restaurant" ? posAuth : adminAuth);

        // Update state immediately
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          userId: null,
          user: null,
          loading: false,
          authType: null,
        });

        // Redirect to appropriate login page
        router.push(authState.authType === "restaurant" ? "/pos/login" : "/admin/login");
      } catch (error) {
        console.error("Logout error:", error);
        throw error; // Re-throw to handle in the caller
      }
    }
  }, [authState.userId, authState.authType, router]);

  useEffect(() => {
    const posUnsubscribe = onAuthStateChanged(posAuth, async (user) => {
      if (user) {
        try {
          const restaurantDoc = await getDoc(doc(posDb, "restaurants", user.uid));
          if (restaurantDoc.exists()) {
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
    });

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

      if (authState.loading) {
        setAuthState((prev) =>
          prev.loading
            ? {
                ...prev,
                loading: false,
              }
            : prev
        );
      }
    });

    return () => {
      posUnsubscribe();
      adminUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authState.loading) {
      const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
      const isPosRoute = pathname.startsWith("/pos") && !pathname.startsWith("/pos/login");

      if (authState.isAuthenticated) {
        if (pathname === "/admin/login" || pathname === "/pos/login") {
          router.push(authState.authType === "restaurant" ? "/pos/dashboard" : "/admin/dashboard");
          return;
        }
        if (isAdminRoute && authState.authType === "restaurant") {
          router.push("/pos/dashboard");
          return;
        }
        if (isPosRoute && authState.authType === "admin") {
          router.push("/admin/dashboard");
          return;
        }
      } else {
        if (isAdminRoute || isPosRoute) {
          router.push(isAdminRoute ? "/admin/login" : "/pos/login");
          return;
        }
      }
    }
  }, [authState.isAuthenticated, authState.authType, authState.loading, pathname, router]);

  const getIdToken = async (): Promise<string> => {
    if (!authState.user) {
      throw new Error("No authenticated user");
    }
    return await getFirebaseIdToken(authState.user);
  };

  return (
    <AuthContext.Provider value={{ ...authState, getIdToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}