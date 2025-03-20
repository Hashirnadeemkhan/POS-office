"use client"

import type React from "react"

import { auth } from "@/lib/firebase"
import { Inter } from "next/font/google"
import { useState, useEffect } from "react"
import "./globals.css"
import Sidebar from "../src/components/Sidebar"
import { useRouter, usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { onAuthStateChanged } from "firebase/auth"
import { Loader2 } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && pathname !== "/admin/login") {
        router.push("/admin/login")
      } else if (user && pathname === "/admin/login") {
        router.push("/admin/dashboard")
      }
      setIsAuthenticated(!!user)
      setLoading(false) // Auth check complete
    })

    return () => unsubscribe()
  }, [router, pathname])

  // Check if we should show the sidebar
  const shouldShowSidebar = isAuthenticated && pathname !== "/admin/login"

  return (
    <html lang="en">
      <body className={`flex h-screen ${inter.className}`}>
        {loading ? (
          <div className="flex items-center justify-center w-full h-screen bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <h2 className="text-xl font-medium text-muted-foreground">Loading...</h2>
            </div>
          </div>
        ) : (
          <>
            {shouldShowSidebar && <Sidebar />}
            <main className="flex-1 p-4 max-w-7xl">
              {children}
              <Toaster />
            </main>
          </>
        )}
      </body>
    </html>
  )
}

