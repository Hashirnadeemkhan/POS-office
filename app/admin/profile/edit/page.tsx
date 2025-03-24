"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

interface UserProfile {
  displayName: string
  email: string
  phoneNumber: string
  role: "admin" | "superadmin"
}

export default function EditProfile() {
  const router = useRouter()
  const { userId, userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    phoneNumber: "",
    role: "admin",
  })

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return

      try {
        setLoading(true)
        const user = auth.currentUser

        if (!user) {
          router.push("/admin/login")
          return
        }

        const userDoc = await getDoc(doc(db, "adminUsers", userId))
        const userData = userDoc.exists() ? userDoc.data() : {}

        setProfile({
          // Always use the current authenticated user's display name and email
          displayName: user.displayName || userData.name || "",
          email: user.email || "",
          phoneNumber: userData.phoneNumber || "",
          role: userRole || userData.role || "admin",
        })
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Failed to load profile data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId, userRole, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      setSaving(true)
      const user = auth.currentUser
      if (user) {
        // Update display name in Firebase Auth
        await updateProfile(user, { displayName: profile.displayName })

        // Update additional fields in Firestore
        await updateDoc(doc(db, "adminUsers", userId), {
          name: profile.displayName, // Also update name in Firestore
          phoneNumber: profile.phoneNumber,
          // Don't update role here - that should be managed by superadmin
        })
      }
      toast.success("Profile updated successfully")
      router.push("/admin/profile/view")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

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
        <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push("/admin/profile/view")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                name="displayName"
                value={profile.displayName}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" value={profile.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleChange}
                placeholder="Your phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" name="role" value={profile.role} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Role is managed by Super Admin</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="button" variant="outline" className="mr-2" onClick={() => router.push("/admin/profile/view")}>
              Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

