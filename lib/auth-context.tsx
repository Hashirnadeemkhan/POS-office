"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface AuthContextType {
  isAuthenticated: boolean
  userRole: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  loading: true,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true)

        try {
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, "adminUsers", user.uid))
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role)
          } else {
            setUserRole("admin") // Default role
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
          setUserRole("admin") // Default role on error
        }
      } else {
        setIsAuthenticated(false)
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ isAuthenticated, userRole, loading }}>{children}</AuthContext.Provider>
}

