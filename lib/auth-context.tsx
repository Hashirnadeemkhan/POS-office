"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { onAuthStateChanged, User, getIdToken as getFirebaseIdToken } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface AuthContextType {
  isAuthenticated: boolean
  userRole: "admin" | "superadmin" | null
  userId: string | null
  user: User | null
  loading: boolean
  getIdToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  userId: null,
  user: null,
  loading: true,
  getIdToken: () => Promise.reject("Auth context not initialized"),
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<Omit<AuthContextType, 'getIdToken'>>({
    isAuthenticated: false,
    userRole: null,
    userId: null,
    user: null,
    loading: true,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "adminUsers", user.uid)
          const userDoc = await getDoc(userDocRef)
          const role = userDoc.exists() ? userDoc.data().role as "admin" | "superadmin" : null

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

    return () => unsubscribe()
  }, [])

  const getIdToken = async (): Promise<string> => {
    if (!authState.user) {
      throw new Error("No authenticated user")
    }
    return await getFirebaseIdToken(authState.user)
  }

  return (
    <AuthContext.Provider value={{ ...authState, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}