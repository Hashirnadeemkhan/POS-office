"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, ShoppingCart, Package, Users, Settings, BarChart3, Layers, Tag, LogOut } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { doc, deleteDoc } from "firebase/firestore"
import { useState } from "react"

interface SidebarLinkProps {
  href: string
  icon: React.ElementType
  label: string
  onClick?: () => Promise<void> | void
  className?: string
}

const SidebarLink = ({ href, icon: Icon, label, onClick, className = "" }: SidebarLinkProps) => {
  const pathname = usePathname()
  const isActive = pathname === href

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          className || (isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100")
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)

      // Get current user
      const currentUser = auth.currentUser
      if (currentUser) {
        // Delete the session document
        await deleteDoc(doc(db, "activeSessions", currentUser.uid))
      }

      // Clear local storage
      localStorage.removeItem("sessionToken")

      // Sign out from Firebase
      await auth.signOut()

      // Redirect to login
      router.push("/admin/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold">POS System</h1>
      </div>

      <nav className="px-3 py-2 space-y-1">
        <SidebarLink href="/admin/dashboard" icon={Home} label="Dashboard" />
        <SidebarLink href="/admin/restaurants" icon={Home} label="Restaurants" />
        <SidebarLink href="/pos" icon={ShoppingCart} label="Point of Sale" />
        <SidebarLink href="/products" icon={Package} label="Products" />
        <SidebarLink href="/category" icon={Layers} label="Categories" />
        <SidebarLink href="/subcategory" icon={Tag} label="Subcategories" />
        <SidebarLink href="/customers" icon={Users} label="Customers" />
        <SidebarLink href="/reports" icon={BarChart3} label="Reports" />
        <SidebarLink href="/settings" icon={Settings} label="Settings" />

        {/* Logout button */}
        <div className="pt-6 mt-6 border-t border-gray-200">
          <SidebarLink
            href="#"
            icon={LogOut}
            label={isLoggingOut ? "Logging out..." : "Logout"}
            onClick={handleLogout}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          />
        </div>
      </nav>
    </aside>
  )
}

