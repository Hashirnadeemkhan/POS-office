// AuthProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onAuthStateChanged, User, getIdToken as getFirebaseIdToken, signOut } from "firebase/auth";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { auth, secondaryAuth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: "admin" | "superadmin" | null;
  userId: string | null;
  user: User | null;
  loading: boolean;
  getIdToken: () => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  user: null,
  loading: true,
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
  });
  const router = useRouter();
  const pathname = usePathname();

  // Determine which auth instance to use based on the route
  const isPosRoute = pathname.startsWith("/pos");
  const currentAuth = isPosRoute ? secondaryAuth : auth;

  const logout = async () => {
    if (authState.userId) {
      await deleteDoc(doc(db, isPosRoute ? "restaurantSessions" : "activeSessions", authState.userId));
      await signOut(currentAuth);
      localStorage.removeItem("sessionToken");
      setAuthState({
        isAuthenticated: false,
        userRole: null,
        userId: null,
        user: null,
        loading: false,
      });
      router.push(isPosRoute ? "/pos/login" : "/admin/login");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
      console.log(`User on ${isPosRoute ? "secondaryAuth" : "auth"}:`, user); // Debug
      if (user) {
        try {
          const userDocRef = doc(db, isPosRoute ? "restaurants" : "adminUsers", user.uid);
          const userDoc = await getDoc(userDocRef);
          const role = userDoc.exists() ? (userDoc.data().role as "admin" | "superadmin") : null;

          setAuthState({
            isAuthenticated: true,
            userRole: role,
            userId: user.uid,
            user,
            loading: false,
          });
        } catch (error) {
          console.error("Error fetching user role:", error);
          setAuthState({
            isAuthenticated: false,
            userRole: null,
            userId: null,
            user: null,
            loading: false,
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          userId: null,
          user: null,
          loading: false,
        });
      }
    });

    const handleBeforeUnload = async () => {
      if (authState.isAuthenticated) {
        await logout();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentAuth, authState.isAuthenticated]);

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