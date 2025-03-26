// "use client"

// import type React from "react"
// import { useState } from "react"
// import Link from "next/link"
// import { usePathname, useRouter } from "next/navigation"
// import { Home, Package, LogOut, LayoutDashboard, List } from "lucide-react"
// import { secondaryAuth, db } from "@/lib/firebase"
// import { doc, deleteDoc } from "firebase/firestore"
// import { usePosAuth } from "@/lib/pos-auth-context"

// const SidebarLink = ({
//   href,
//   icon: Icon,
//   label,
//   onClick,
//   className,
// }: {
//   href: string
//   icon: React.ElementType
//   label: string
//   onClick?: () => void
//   className?: string
// }) => {
//   const pathname = usePathname()
//   const isActive = pathname === href
//   const baseClasses = `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`
//   const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses

//   if (onClick) {
//     return (
//       <button onClick={onClick} className={`w-full ${combinedClasses}`}>
//         <Icon size={20} />
//         <span>{label}</span>
//       </button>
//     )
//   }

//   return (
//     <Link href={href} className={combinedClasses}>
//       <Icon size={20} />
//       <span>{label}</span>
//     </Link>
//   )
// }

// export default function PosSidebar() {
//   const router = useRouter()
//   const pathname = usePathname()
//   const [isLoggingOut, setIsLoggingOut] = useState(false)
//   const { user } = usePosAuth()

//   const handleLogout = async () => {
//     setIsLoggingOut(true)
//     try {
//       if (user) await deleteDoc(doc(db, "restaurantSessions", user.uid))
//       localStorage.removeItem("restaurantSessionToken")
//       await secondaryAuth.signOut()
//       router.push("/pos/login")
//     } catch (error) {
//       console.error("POS Logout error:", error)
//     } finally {
//       setIsLoggingOut(false)
//     }
//   }

//   return (
//     <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
//       <div className="p-6">
//         <h1 className="text-xl font-bold">POS Panel</h1>
//       </div>
//       <nav className="px-3 py-2 space-y-1">
//         <SidebarLink href="/pos/dashboard" icon={LayoutDashboard} label="Dashboard" />
//         <SidebarLink href="/pos" icon={Home} label="POS" />
//         <SidebarLink href="/pos/category" icon={List} label="Categories" />
//         <SidebarLink href="/pos/subcategory" icon={List} label="Subcategories" />
//         <SidebarLink href="/pos/products" icon={Package} label="Products" />
//         <div className="pt-6 mt-6 border-t border-gray-200">
//           <SidebarLink
//             href="#"
//             icon={LogOut}
//             label={isLoggingOut ? "Logging out..." : "Logout"}
//             onClick={handleLogout}
//             className="text-red-600 hover:bg-red-50 hover:text-red-700"
//           />
//         </div>
//       </nav>
//     </aside>
//   )
// }