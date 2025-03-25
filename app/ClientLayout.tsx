"use client"

import React, { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import Sidebar from "@/src/components/Sidebar"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

// ClientLayout.tsx
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, userRole } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      const isRestaurantUser = isAuthenticated && !userRole // Restaurant user has no admin role
      
      if (!isAuthenticated && !pathname.startsWith("/admin/login") && !pathname.startsWith("/pos/login")) {
        router.push("/admin/login")
      } else if (isAuthenticated) {
        if (pathname === "/admin/login" || pathname === "/pos/login") {
          router.push(isRestaurantUser ? "/pos/dashboard" : "/admin/dashboard")
        }
      }
    }
  }, [isAuthenticated, loading, pathname, router, userRole])

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    )
  }

  const shouldShowSidebar = isAuthenticated && 
                           pathname !== "/admin/login" && 
                           pathname !== "/pos/login"

  return (
    <div className="flex h-screen">
      {shouldShowSidebar && <Sidebar />}
      <main className="flex-1 p-4 max-w-7xl">
        {children}
        <Toaster />
      </main>
    </div>
  )
}