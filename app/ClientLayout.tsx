// ClientLayout.tsx
"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";
import Sidebar from "@/src/components/Sidebar";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, authType } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }


  // Don't show sidebar on login pages
  const shouldShowSidebar = isAuthenticated && 
    (authType === "admin" || authType === "restaurant");

  return (
    <div className="flex h-screen">
      {shouldShowSidebar && <Sidebar />}
      <main className="flex-1 p-4 ">
        {children}
        <Toaster />
      </main>
    </div>
  );
}