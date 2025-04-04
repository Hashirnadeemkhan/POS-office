"use client";

import React, { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { posAuth, posDb } from "@/firebase/client";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/lib/auth-context";

export default function PosLoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const { isAuthenticated, authType } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && authType === "restaurant") {
      router.push("/pos/dashboard");
    }
  }, [isAuthenticated, authType, router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Sign out from any existing auth to avoid conflicts
      await posAuth.signOut();

      // Authenticate with email and password
      const userCredential = await signInWithEmailAndPassword(posAuth, email, password);
      const user = userCredential.user;

      // Fetch restaurant data from Firestore
      const restaurantDoc = await getDoc(doc(posDb, "restaurants", user.uid));
      if (!restaurantDoc.exists()) {
        throw new Error("Restaurant account not found");
      }

      const restaurantData = restaurantDoc.data();

      // Check if the account is active
      if (!restaurantData.isActive) {
        await posAuth.signOut(); // Sign out immediately if inactive
        throw new Error("This account is not active");
      }

      // Check activation and expiry dates
      const currentDate = new Date();
      const activationDate = new Date(restaurantData.tokenActivationDate);
      const expiryDate = new Date(restaurantData.tokenExpiresAt);

      if (currentDate < activationDate) {
        await posAuth.signOut();
        throw new Error(`Account activates on ${activationDate.toLocaleDateString()}`);
      }
      if (currentDate > expiryDate) {
        await posAuth.signOut();
        throw new Error(`Account expired on ${expiryDate.toLocaleDateString()}`);
      }

      // Create a session token for active accounts
      const sessionToken = uuidv4();
      await setDoc(doc(posDb, "restaurantSessions", user.uid), {
        sessionToken,
        email: user.email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      localStorage.setItem("restaurantSessionToken", sessionToken);
      router.push("/pos/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An error occurred during login.");
      await posAuth.signOut(); // Ensure user is signed out on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
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
  );
}