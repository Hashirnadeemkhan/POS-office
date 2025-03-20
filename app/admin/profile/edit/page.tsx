"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { updateProfile, type User } from "firebase/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface UserProfile {
  displayName: string
  email: string
  photoURL: string
  phoneNumber: string
  role: string
  address: string
  joinDate: string
  restaurant: string
}

export default function EditProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    photoURL: "",
    phoneNumber: "",
    role: "",
    address: "",
    joinDate: "",
    restaurant: "",
  })

  const fetchUserProfile = useCallback(
    async (userId: string) => {
      try {
        setLoading(true)
        const userDoc = await getDoc(doc(db, "users", userId))

        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<UserProfile, "email" | "displayName" | "photoURL">

          // Combine Firebase Auth user data with Firestore profile data
          setProfile({
            displayName: currentUser?.displayName || "User",
            email: currentUser?.email || "",
            photoURL: currentUser?.photoURL || "",
            phoneNumber: userData.phoneNumber || "",
            role: userData.role || "Staff",
            address: userData.address || "",
            joinDate: userData.joinDate || new Date().toISOString().split("T")[0],
            restaurant: userData.restaurant || "Main Branch",
          })
        } else {
          // If no profile document exists yet, use basic auth data
          setProfile({
            displayName: currentUser?.displayName || "User",
            email: currentUser?.email || "",
            photoURL: currentUser?.photoURL || "",
            phoneNumber: currentUser?.phoneNumber || "",
            role: "Staff",
            address: "",
            joinDate: new Date().toISOString().split("T")[0],
            restaurant: "Main Branch",
          })
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Failed to load profile data")
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setProfile((prev) => ({ ...prev, [name]: value }))
  }


    

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      setSaving(true)

      // Update display name in Firebase Auth
      await updateProfile(currentUser, {
        displayName: profile.displayName,
      })

      // Update additional profile data in Firestore
      await updateDoc(doc(db, "users", currentUser.uid), {
        phoneNumber: profile.phoneNumber,
        role: profile.role,
        address: profile.address,
        restaurant: profile.restaurant,
        // Don't update joinDate as it should remain the original
      })

      toast.success("Profile updated successfully")
      router.push("/admin/profile/view")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
       

          {/* Profile Details Card */}
          <Card className="md:col-span-2">
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

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={profile.role} onValueChange={(value) => handleSelectChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurant">Restaurant</Label>
                <Select value={profile.restaurant} onValueChange={(value) => handleSelectChange("restaurant", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Branch">Main Branch</SelectItem>
                    <SelectItem value="Downtown">Downtown</SelectItem>
                    <SelectItem value="Uptown">Uptown</SelectItem>
                    <SelectItem value="West Side">West Side</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="Your address"
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => router.push("/admin/profile/view")}
              >
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
        </div>
      </form>
    </div>
  )
}

