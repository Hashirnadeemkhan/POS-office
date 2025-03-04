"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ShoppingCart, Package, Users, Settings, BarChart3, Layers, Tag } from "lucide-react"

interface SidebarLinkProps {
  href: string
  icon: React.ElementType
  label: string
}

const SidebarLink = ({ href, icon: Icon, label }: SidebarLinkProps) => {
  const pathname = usePathname()
  const isActive = pathname === href

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
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl font-bold">POS System</h1>
      </div>

      <nav className="px-3 py-2 space-y-1">
        <SidebarLink href="/" icon={Home} label="Dashboard" />
        <SidebarLink href="/pos" icon={ShoppingCart} label="Point of Sale" />
        <SidebarLink href="/products" icon={Package} label="Products" />
        <SidebarLink href="/category" icon={Layers} label="Categories" />
        <SidebarLink href="/subcategory" icon={Tag} label="Subcategories" />
        <SidebarLink href="/customers" icon={Users} label="Customers" />
        <SidebarLink href="/reports" icon={BarChart3} label="Reports" />
        <SidebarLink href="/settings" icon={Settings} label="Settings" />
      </nav>
    </aside>
  )
}

