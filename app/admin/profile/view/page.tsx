"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import type { User } from "firebase/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Phone, MapPin, Building, Calendar, Edit, ArrowLeft } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface UserProfile {
  displayName: string
  email: string
  phoneNumber: string
  role: string
  address: string
  joinDate: string
  restaurant: string
}

export default function ViewProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const fetchUserProfile = useCallback(
    async (userId: string) => {
      try {
        setLoading(true)
        const userDoc = await getDoc(doc(db, "users", userId))

        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<UserProfile, "email" | "displayName">

          // Combine Firebase Auth user data with Firestore profile data
          setProfile({
            displayName: currentUser?.displayName || "User",
            email: currentUser?.email || "",
            phoneNumber: userData.phoneNumber || "",
            role: userData.role || "Staff",
            address: userData.address || "",
            joinDate: userData.joinDate || new Date().toISOString().split("T")[0],
            restaurant: userData.restaurant || "Main Branch",
          })
        } else {
          setProfile({
            displayName: currentUser?.displayName || "User",
            email: currentUser?.email || "",
            phoneNumber: currentUser?.phoneNumber || "",
            role: "Staff",
            address: "",
            joinDate: new Date().toISOString().split("T")[0],
            restaurant: "Main Branch",
          })
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    },
    [currentUser],
  )

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user)
        await fetchUserProfile(user.uid)
      } else {
        router.push("/admin/login")
      }
    })

    return () => unsubscribe()
  }, [router, fetchUserProfile])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
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
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile?.email}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Phone Number</div>
            <div className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile?.phoneNumber || "Not provided"}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Restaurant</div>
            <div className="flex items-center">
              <Building className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile?.restaurant}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Address</div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile?.address || "Not provided"}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Join Date</div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{profile?.joinDate}</span>
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
