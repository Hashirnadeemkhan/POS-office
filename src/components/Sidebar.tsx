"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Package, User, UserCog, LogOut, ChevronDown, ChevronUp, Users, LayoutDashboard, List } from "lucide-react"
import { adminAuth, posAuth, adminDb, posDb } from "@/firebase/client" // Updated import
import { doc, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"

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
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { userRole, user } = useAuth()

  const isPosInterface = pathname.startsWith("/pos") || 
                        pathname.startsWith("/pos/category") || 
                        pathname.startsWith("/pos/subcategory") || 
                        pathname.startsWith("/pos/products") || 
                        pathname === "/pos/dashboard"

  const currentAuth = isPosInterface ? posAuth : adminAuth
  const currentDb = isPosInterface ? posDb : adminDb

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const currentUser = currentAuth.currentUser
      if (currentUser) {
        await deleteDoc(doc(currentDb, isPosInterface ? "restaurantSessions" : "activeSessions", currentUser.uid))
      }
      localStorage.removeItem(isPosInterface ? "restaurantSessionToken" : "sessionToken")
      await currentAuth.signOut()
      router.push(isPosInterface ? "/pos/login" : "/admin/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const toggleProfileMenu = () => setIsProfileOpen(!isProfileOpen)

  const renderAdminSidebar = () => (
    <nav className="px-3 py-2 space-y-1">
      <SidebarLink href="/admin/dashboard" icon={Home} label="Dashboard" />
      <SidebarLink href="/admin/restaurants" icon={Home} label="Restaurants" />
      {userRole === "superadmin" && (
        <SidebarLink href="/admin/admins" icon={Users} label="Admin Management" />
      )}

      <div className="relative">
        <button
          onClick={toggleProfileMenu}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
            pathname.startsWith("/admin/profile") ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <User size={20} />
            <span>Manage Profile</span>
          </div>
          {isProfileOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isProfileOpen && (
          <div className="ml-6 mt-1 bg-gray-50 rounded-lg overflow-hidden">
            <Link
              href="/admin/profile/view"
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                pathname === "/admin/profile/view" ? "bg-gray-200" : "hover:bg-gray-100"
              }`}
            >
              <User size={18} />
              <span>View Profile</span>
            </Link>
            <Link
              href="/admin/profile/edit"
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                pathname === "/admin/profile/edit" ? "bg-gray-200" : "hover:bg-gray-100"
              }`}
            >
              <UserCog size={18} />
              <span>Edit Profile</span>
            </Link>
          </div>
        )}
      </div>

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
  )

  const renderPosSidebar = () => (
    <nav className="px-3 py-2 space-y-1">
      <SidebarLink href="/pos/dashboard" icon={LayoutDashboard} label="Dashboard" />
      <SidebarLink href="/pos/products" icon={Package} label="Products" />
      <SidebarLink href="/pos" icon={Home} label="POS" />
      <SidebarLink href="/pos/category" icon={List} label="Categories" />
      <SidebarLink href="/pos/subcategory" icon={List} label="Subcategories" />
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
  )

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold">{isPosInterface ? "POS Panel" : "Admin Panel"}</h1>
      </div>
      {isPosInterface ? renderPosSidebar() : renderAdminSidebar()}
    </aside>
  )
}