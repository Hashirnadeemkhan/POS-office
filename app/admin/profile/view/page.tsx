"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Phone, Calendar, Edit, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface UserProfile {
  displayName: string
  email: string
  phoneNumber: string
  role: "admin" | "superadmin"
  joinDate?: string
}

export default function ViewProfile() {
  const router = useRouter()
  const { userId, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        router.push("/admin/login")
        return
      }

      try {
        setLoading(true)
        const user = auth.currentUser

        if (!user) {
          router.push("/admin/login")
          return
        }

        // Get the admin user document from Firestore
        const userDoc = await getDoc(doc(db, "adminUsers", userId))
        const userData = userDoc.exists() ? userDoc.data() : {}

        setProfile({
          // Always use the current authenticated user's display name and email
          displayName: user.displayName || userData.name || "User",
          email: user.email || "Email not available",
          phoneNumber: userData.phoneNumber || "",
          role: userRole || userData.role || "admin",
          joinDate: userData.createdAt?.toDate().toLocaleDateString() || "Not available",
        })
      } catch (error) {
        console.error("Error fetching profile:", error)
        router.push("/admin/login")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId, userRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <div>Error loading profile. Please try again.</div>
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your personal and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Name</div>
            <div>{profile.displayName}</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile.email}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Phone Number</div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile.phoneNumber || "Not provided"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Role</div>
            <div>{profile.role}</div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Join Date</div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile.joinDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={() => router.push("/admin/profile/edit")}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>
    </div>
  )
}

