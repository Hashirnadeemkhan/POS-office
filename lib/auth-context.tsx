// lib/auth-context.tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { onAuthStateChanged, User, getIdToken as getFirebaseIdToken, signOut } from "firebase/auth"
import { doc, getDoc, deleteDoc } from "firebase/firestore"
import { adminAuth, posAuth, adminDb, posDb } from "@/firebase/client"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  userRole: "admin" | "superadmin" | "restaurant" | null
  userId: string | null
  user: User | null
  loading: boolean
  authType: "admin" | "restaurant" | null // Add this to track which auth system is active
  getIdToken: () => Promise<string>
  logout: () => Promise<void>
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
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<Omit<AuthContextType, "getIdToken" | "logout">>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
    user: null,
    loading: true,
    authType: null,
  })
  const router = useRouter()
  const pathname = usePathname()

  const isPosRoute = pathname.startsWith("/pos")
  const currentAuth = isPosRoute ? posAuth : adminAuth
  const currentDb = isPosRoute ? posDb : adminDb

  const logout = useCallback(async () => {
    if (authState.userId) {
      try {
        // Delete the session document based on user type
        if (authState.authType === "restaurant") {
          await deleteDoc(doc(posDb, "restaurantSessions", authState.userId))
          localStorage.removeItem("restaurantSessionToken")
        } else if (authState.authType === "admin") {
          await deleteDoc(doc(adminDb, "activeSessions", authState.userId))
          localStorage.removeItem("sessionToken")
        }
        
        // Sign out from the appropriate auth service
        await signOut(authState.authType === "restaurant" ? posAuth : adminAuth)
        
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          userId: null,
          user: null,
          loading: false,
          authType: null,
        })
        
        router.push(authState.authType === "restaurant" ? "/pos/login" : "/admin/login")
      } catch (error) {
        console.error("Logout error:", error)
      }
    }
  }, [authState.userId, authState.authType, router])

  useEffect(() => {
    // Check restaurant auth first
    const posUnsubscribe = onAuthStateChanged(posAuth, async (user) => {
      if (user) {
        try {
          const restaurantDoc = await getDoc(doc(posDb, "restaurants", user.uid))
          if (restaurantDoc.exists()) {
            // Restaurant user authenticated
            setAuthState({
              isAuthenticated: true,
              userRole: "restaurant",
              userId: user.uid,
              user,
              loading: false,
              authType: "restaurant",
            })
            return
          }
        } catch (error) {
          console.error("Error fetching restaurant data:", error)
        }
      }
    })
    
    // Check admin auth
    const adminUnsubscribe = onAuthStateChanged(adminAuth, async (user) => {
      if (user) {
        try {
          const adminDoc = await getDoc(doc(adminDb, "adminUsers", user.uid))
          if (adminDoc.exists()) {
            // Admin user authenticated
            setAuthState({
              isAuthenticated: true,
              userRole: adminDoc.data().role as "admin" | "superadmin",
              userId: user.uid,
              user,
              loading: false,
              authType: "admin",
            })
            return
          }
        } catch (error) {
          console.error("Error fetching admin data:", error)
        }
      }
      
      // If we get here and authState.loading is still true, no active auth was found
      if (authState.loading) {
        setAuthState(prev => prev.loading ? {
          ...prev,
          loading: false
        } : prev)
      }
    })

    return () => {
      posUnsubscribe()
      adminUnsubscribe()
    }
  }, [])

  // Redirect users based on auth state and current route
  useEffect(() => {
    if (!authState.loading) {
      const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")
      const isPosRoute = pathname.startsWith("/pos") && !pathname.startsWith("/pos/login")
      
      if (authState.isAuthenticated) {
        // Redirect logged in users who are on login pages
        if (pathname === "/admin/login" || pathname === "/pos/login") {
          router.push(authState.authType === "restaurant" ? "/pos/dashboard" : "/admin/dashboard")
          return
        }
        
        // Redirect restaurant users trying to access admin routes
        if (isAdminRoute && authState.authType === "restaurant") {
          router.push("/pos/dashboard")
          return
        }
        
        // Redirect admin users trying to access POS routes
        if (isPosRoute && authState.authType === "admin") {
          router.push("/admin/dashboard")
          return
        }
      } else {
        // Redirect unauthenticated users trying to access protected routes
        if (isAdminRoute || isPosRoute) {
          router.push(isAdminRoute ? "/admin/login" : "/pos/login")
          return
        }
      }
    }
  }, [authState.isAuthenticated, authState.authType, authState.loading, pathname, router])

  const getIdToken = async (): Promise<string> => {
    if (!authState.user) {
      throw new Error("No authenticated user")
    }
    return await getFirebaseIdToken(authState.user)
  }

  return (
    <AuthContext.Provider value={{ ...authState, getIdToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}