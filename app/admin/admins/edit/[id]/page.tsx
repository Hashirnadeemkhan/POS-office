"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"

export default function EditAdminPage({ params }: { params: { id: string } }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "admin",
  })
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { id } = params
  const { userRole } = useAuth()

  useEffect(() => {
    // Check if current user is superadmin
    if (userRole !== "superadmin") {
      toast.error("Only Super Admins can edit admin accounts")
      router.push("/admin/dashboard")
      return
    }

    const fetchAdmin = async () => {
      try {
        setIsLoading(true)
        const docRef = doc(db, "adminUsers", id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setFormData({
            name: data.name || "",
            email: data.email || "",
            role: data.role || "admin",
          })
        } else {
          toast.error("Admin account not found")
          router.push("/admin/admins")
        }
      } catch (error) {
        console.error("Error fetching admin:", error)
        toast.error("Failed to load admin account")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAdmin()
  }, [id, router, userRole])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const docRef = doc(db, "adminUsers", id)
      const originalDoc = await getDoc(docRef)
      const originalData = originalDoc.data()

      // Prepare update data for Firestore
      const updateData: any = {
        name: formData.name,
        role: formData.role,
        lastUpdated: serverTimestamp(),
      }

      // Handle email update
      if (formData.email !== originalData?.email) {
        // For superadmins, we can update email without requiring current password
        try {
          // This would typically require Firebase Admin SDK in a server action
          // For this example, we'll just update the email in Firestore
          updateData.email = formData.email
        } catch (error) {
          console.error("Error updating email:", error)
          toast.error("Failed to update email")
          setIsSubmitting(false)
          return
        }
      }

      // Handle password update
      if (password) {
        // For superadmins, we can update password without requiring current password
        try {
          // This would typically require Firebase Admin SDK in a server action
          // For this example, we'll just note that the password would be updated
          console.log("Password would be updated")
        } catch (error) {
          console.error("Error updating password:", error)
          toast.error("Failed to update password")
          setIsSubmitting(false)
          return
        }
      }

      // Update Firestore document
      await updateDoc(docRef, updateData)

      toast.success("Admin account updated successfully")
      router.push("/admin/admins")
    } catch (error: any) {
      console.error("Error updating admin:", error)
      toast.error(error.message || "Failed to update admin account")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/admin/admins")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Admin Accounts
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Admin Account</CardTitle>
          <CardDescription>
            Update admin account details. As a Super Admin, you can modify all fields without requiring the current
            password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter admin's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current password. Minimum 6 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Super Admins can manage both restaurants and other admins. Regular Admins can only manage restaurants.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Admin Account"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

