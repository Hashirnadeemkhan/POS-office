"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { onAuthStateChanged, User, getIdToken as getFirebaseIdToken, signOut } from "firebase/auth"
import { doc, getDoc, deleteDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  userRole: "admin" | "superadmin" | null
  userId: string | null
  user: User | null
  loading: boolean
  getIdToken: () => Promise<string>
  logout: () => Promise<void> // Add logout method
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  user: null,
  loading: true,
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
  })
  const router = useRouter()

  // Logout function
  const logout = async () => {
    if (authState.userId) {
      // Delete session from Firestore
      await deleteDoc(doc(db, "activeSessions", authState.userId))
      // Sign out from Firebase Authentication
      await signOut(auth)
      // Clear localStorage
      localStorage.removeItem("sessionToken")
      setAuthState({
        isAuthenticated: false,
        userRole: null,
        userId: null,
        user: null,
        loading: false,
      })
      router.push("/login") // Redirect to login page
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "adminUsers", user.uid)
          const userDoc = await getDoc(userDocRef)
          const role = userDoc.exists() ? (userDoc.data().role as "admin" | "superadmin") : null

          setAuthState({
            isAuthenticated: true,
            userRole: role,
            userId: user.uid,
            user,
            loading: false,
          })
        } catch (error) {
          console.error("Error fetching user role:", error)
          setAuthState({
            isAuthenticated: false,
            userRole: null,
            userId: null,
            user: null,
            loading: false,
          })
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          userRole: null,
          userId: null,
          user: null,
          loading: false,
        })
      }
    })

    // Handle window/tab close
    const handleBeforeUnload = async () => {
      if (authState.isAuthenticated) {
        await logout()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      unsubscribe()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [authState.isAuthenticated])

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