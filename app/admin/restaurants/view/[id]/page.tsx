"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, Calendar, Mail, User, Store, Key, Clock, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"

interface Restaurant {
  id: string
  name: string
  email: string
  ownerName: string
  activationToken: string
  isActive: boolean
  createdAt: Date
  lastUpdated: Date
  tokenActivationDate?: Date
  tokenExpiresAt?: Date
}

export default function ViewRestaurantPage({ params }: { params: { id: string } }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Wrap fetchRestaurant in useCallback to stabilize its reference
  const fetchRestaurant = useCallback(async () => {
    setIsLoading(true)
    try {
      const restaurantRef = doc(db, "restaurants", params.id)
      const restaurantSnap = await getDoc(restaurantRef)

      if (restaurantSnap.exists()) {
        const data = restaurantSnap.data()
        setRestaurant({
          id: restaurantSnap.id,
          name: data.name || "",
          email: data.email || "",
          ownerName: data.ownerName || "",
          activationToken: data.activationToken || "",
          isActive: data.isActive || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
          tokenActivationDate: data.tokenActivationDate ? new Date(data.tokenActivationDate) : undefined,
          tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
        })
      } else {
        toast.error("Restaurant not found")
        router.push("/admin/restaurants")
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error)
      toast.error("Failed to load restaurant details")
    } finally {
      setIsLoading(false)
    }
  }, [params.id, router]) // Dependencies for fetchRestaurant

  // Use fetchRestaurant in useEffect with proper dependency
  useEffect(() => {
    fetchRestaurant()
  }, [fetchRestaurant])

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <p>Loading restaurant details...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="container py-10">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 text-center">
            <p>Restaurant not found.</p>
            <Button className="mt-4" onClick={() => router.push("/admin/restaurants")}>
              Back to Restaurants
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/admin/restaurants")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Restaurants
      </Button>

      <Card className="max-w-3xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
              <CardDescription>Restaurant Details</CardDescription>
            </div>
            <Badge
              variant={restaurant.isActive ? "default" : "outline"}
              className={
                restaurant.isActive
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "text-red-800 border-red-300 bg-red-50 hover:bg-red-50 hover:text-red-800"
              }
            >
              {restaurant.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Restaurant Name</h3>
                  <p>{restaurant.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Owner Name</h3>
                  <p>{restaurant.ownerName}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Email</h3>
                  <p>{restaurant.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Created At</h3>
                  <p>{format(restaurant.createdAt, "PPP 'at' p")}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Last Updated</h3>
                  <p>{format(restaurant.lastUpdated, "PPP 'at' p")}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-3">Activation Details</h3>
            <div className="bg-muted p-4 rounded-md">
              <div className="flex items-start gap-2 mb-3">
                <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium">Activation Token</h4>
                  <p className="font-mono text-sm break-all">{restaurant.activationToken}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {restaurant.tokenActivationDate && (
                  <div>
                    <h4 className="font-medium text-sm">Activation Date</h4>
                    <p>{format(restaurant.tokenActivationDate, "PPP")}</p>
                  </div>
                )}

                {restaurant.tokenExpiresAt && (
                  <div>
                    <h4 className="font-medium text-sm">Expiry Date</h4>
                    <p>{format(restaurant.tokenExpiresAt, "PPP")}</p>
                    {new Date() > restaurant.tokenExpiresAt && (
                      <Badge variant="outline" className="mt-1 bg-red-50 text-red-800 border-red-200">
                        Expired
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => router.push("/admin/restaurants")}>
            Back
          </Button>
          <div className="space-x-2">
            <Button
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push(`/admin/restaurants/edit/${restaurant.id}`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}