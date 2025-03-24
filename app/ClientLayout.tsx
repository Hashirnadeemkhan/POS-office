"use client"

import React, { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import Sidebar from "@/src/components/Sidebar"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && pathname !== "/admin/login") {
        router.push("/admin/login")
      } else if (isAuthenticated && pathname === "/admin/login") {
        router.push("/admin/dashboard")
      }
    }
  }, [isAuthenticated, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    )
  }

  const shouldShowSidebar = isAuthenticated && pathname !== "/admin/login"

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