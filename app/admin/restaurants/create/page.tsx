"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Calendar } from "lucide-react"
import { generateActivationToken } from "@/lib/utils"

export default function CreateRestaurantPage() {
  // Get today's date in YYYY-MM-DD format for default values
  const today = new Date().toISOString().split("T")[0]

  // Calculate default expiry date (30 days from today)
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)
  const defaultExpiryDateString = defaultExpiryDate.toISOString().split("T")[0]

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    ownerName: "",
    activationToken: "",
    activationDate: today,
    expiryDate: defaultExpiryDateString,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [tokenActivation, setTokenActivation] = useState<string | null>(null)
  const [tokenExpiration, setTokenExpiration] = useState<string | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Generate a unique activation token or use the provided one
      const activationToken = formData.activationToken.trim() || generateActivationToken()

      // Parse dates
      const activationDate = new Date(formData.activationDate)
      let expiryDate = new Date(formData.expiryDate)

      // Security check: ensure activation date is not in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (activationDate < today) {
        toast.warning("Activation date cannot be in the past. Using today's date.")
        activationDate.setTime(today.getTime())
      }

      // Security check: ensure expiry date is after activation date
      if (expiryDate <= activationDate) {
        toast.warning("Expiry date must be after activation date. Setting to 30 days after activation.")
        expiryDate = new Date(activationDate)
        expiryDate.setDate(activationDate.getDate() + 30)
      }

      // Security check: limit to maximum 365 days from activation date
      const maxExpiryDate = new Date(activationDate)
      maxExpiryDate.setDate(activationDate.getDate() + 365)

      if (expiryDate > maxExpiryDate) {
        toast.warning("Expiry date limited to maximum 365 days from activation date.")
        expiryDate = maxExpiryDate
      }

      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      // Store additional restaurant data in Firestore
      await addDoc(collection(db, "restaurants"), {
        name: formData.name,
        email: formData.email,
        ownerName: formData.ownerName,
        activationToken,
        isActive: true,
        uid: userCredential.user.uid,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        tokenCreatedAt: new Date().toISOString(),
        tokenActivationDate: activationDate.toISOString(),
        tokenExpiresAt: expiryDate.toISOString(),
      })

      // Set the token and dates for display
      setCreatedToken(activationToken)
      setTokenActivation(activationDate.toLocaleDateString())
      setTokenExpiration(expiryDate.toLocaleDateString())

      toast.success("Restaurant account created successfully")
    } catch (error: any) {
      console.error("Error creating restaurant:", error)

      if (error.code === "auth/email-already-in-use") {
        toast.error("Email is already in use. Please use a different email.")
      } else {
        toast.error("Failed to create restaurant account")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDone = () => {
    router.push("/admin/restaurants")
  }

  return (
    <div className="container py-10">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/admin/restaurants")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Restaurants
      </Button>

      {createdToken ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Restaurant Account Created</CardTitle>
            <CardDescription>
              The restaurant account has been created successfully. Please save the activation token information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-md bg-muted">
              <h3 className="font-medium mb-2">Activation Token</h3>
              <p className="font-mono text-sm break-all bg-background p-2 rounded">{createdToken}</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Activation Date:</span> {tokenActivation}
                  </p>
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Expiry Date:</span> {tokenExpiration}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <p className="text-sm">A renewal notification will be sent 7 days before expiration.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleDone} className="w-full bg-purple-600 hover:bg-purple-700">
              Done
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Restaurant Account</CardTitle>
            <CardDescription>
              Add a new restaurant to the platform. This will create both an authentication account and a restaurant
              profile.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter restaurant name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="Enter owner name"
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Password must be at least 6 characters long.</p>
              </div>

          

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activationDate">Activation Date</Label>
                  <div className="relative">
                    <Input
                      id="activationDate"
                      name="activationDate"
                      type="date"
                      value={formData.activationDate}
                      onChange={handleChange}
                      min={today}
                      required
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Date when the token becomes active.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <div className="relative">
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      min={formData.activationDate}
                      required
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Maximum 365 days from activation date.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activationToken">Activation Token</Label>
                <Input
                  id="activationToken"
                  name="activationToken"
                  value={formData.activationToken}
                  onChange={handleChange}
                  placeholder="Enter activation token or leave empty to generate automatically"
                />
                <p className="text-xs text-muted-foreground">Optional. Leave empty to generate automatically.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Restaurant Account"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  )
}

