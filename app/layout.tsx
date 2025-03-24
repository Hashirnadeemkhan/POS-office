// app/layout.tsx
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import ClientLayout from "./ClientLayout" // Note the case sensitivity

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "POS Admin Panel",
  description: "Admin panel for POS system",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}