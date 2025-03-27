"use client"

import React, { useState, FormEvent } from "react"
import { Eye, EyeOff } from "lucide-react"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"
import { secondaryAuth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { useAuth } from "@/lib/auth-context"

export default function PosLoginPage() {
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const router = useRouter()
  const { isAuthenticated, logout } = useAuth()

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/pos/dashboard")
    }

    // Cleanup on unmount or page leave
    return () => {
      if (isAuthenticated) {
        logout() // Trigger logout when component unmounts
      }
    }
  }, [isAuthenticated, router, logout])

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(secondaryAuth, email, password)
      const user = userCredential.user

      const restaurantDoc = await getDoc(doc(db, "restaurants", user.uid))
      if (!restaurantDoc.exists()) {
        throw new Error("Restaurant account not found.")
      }

      const restaurantData = restaurantDoc.data()
      const tokenActivationDate = new Date(restaurantData.tokenActivationDate)
      const tokenExpiresAt = new Date(restaurantData.tokenExpiresAt)
      const currentDate = new Date()

      if (!restaurantData.isActive) {
        throw new Error("This account is currently inactive.")
      }
      if (currentDate < tokenActivationDate) {
        throw new Error("This account is not yet active. Activation date: " + tokenActivationDate.toLocaleDateString())
      }
      if (currentDate > tokenExpiresAt) {
        throw new Error("This account has expired. Expiry date: " + tokenExpiresAt.toLocaleDateString())
      }

      const sessionToken = uuidv4()
      await setDoc(doc(db, "restaurantSessions", user.uid), {
        sessionToken,
        email: user.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      localStorage.setItem("restaurantSessionToken", sessionToken)
      console.log("Restaurant logged in successfully")
      router.push("/pos/dashboard")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "An error occurred during login.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed i-nset-0 flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 mx-4">
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-8">POS Login</h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="restaurant@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors pr-12"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full p-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}