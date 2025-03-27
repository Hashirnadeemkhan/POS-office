// app/admin/restaurants/[id]/edit/page.tsx
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Loader2, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { generateActivationToken } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface Restaurant {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  activationToken: string;
  isActive: boolean;
  tokenActivationDate?: string;
  tokenExpiresAt?: string;
}

export default function EditRestaurantPage({ params }: { params: { id: string } }) {
  const { userRole } = useAuth();
  const [formData, setFormData] = useState<Restaurant>({
    id: "",
    name: "",
    email: "",
    ownerName: "",
    activationToken: "",
    isActive: true,
    tokenActivationDate: "",
    tokenExpiresAt: "",
  });
  const [originalEmail, setOriginalEmail] = useState(""); // Track original email
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regenerateToken, setRegenerateToken] = useState(false);
  const [originalToken, setOriginalToken] = useState("");
  const [newToken, setNewToken] = useState("");
  const [isTokenRefreshing, setIsTokenRefreshing] = useState(false);
  const router = useRouter();

  const fetchRestaurant = useCallback(async () => {
    setIsLoading(true);
    try {
      const restaurantRef = doc(db, "restaurants", params.id);
      const restaurantSnap = await getDoc(restaurantRef);

      if (restaurantSnap.exists()) {
        const data = restaurantSnap.data();
        const tokenActivationDate = data.tokenActivationDate
          ? new Date(data.tokenActivationDate).toISOString().split("T")[0]
          : "";
        const tokenExpiresAt = data.tokenExpiresAt ? new Date(data.tokenExpiresAt).toISOString().split("T")[0] : "";

        const currentToken = data.activationToken || "";
        setOriginalToken(currentToken);
        setOriginalEmail(data.email || "");

        setFormData({
          id: restaurantSnap.id,
          name: data.name || "",
          email: data.email || "",
          ownerName: data.ownerName || "",
          activationToken: currentToken,
          isActive: data.isActive || false,
          tokenActivationDate,
          tokenExpiresAt,
        });
      } else {
        toast.error("Restaurant not found");
        router.push("/admin/restaurants");
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      toast.error("Failed to load restaurant details");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  useEffect(() => {
    if (regenerateToken) {
      if (!newToken) {
        const generatedToken = generateActivationToken();
        setNewToken(generatedToken);
        setFormData((prev) => ({ ...prev, activationToken: generatedToken }));
      }
    } else {
      setFormData((prev) => ({ ...prev, activationToken: originalToken }));
      setNewToken("");
    }
  }, [regenerateToken, originalToken, newToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const handleRegenerateTokenChange = (checked: boolean) => {
    setRegenerateToken(checked);
  };

  const handleManualTokenRefresh = () => {
    setIsTokenRefreshing(true);
    setTimeout(() => {
      const generatedToken = generateActivationToken();
      setNewToken(generatedToken);
      setFormData((prev) => ({ ...prev, activationToken: generatedToken }));
      setIsTokenRefreshing(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRole) return;

    setIsSubmitting(true);

    try {
      const activationDate = formData.tokenActivationDate ? new Date(formData.tokenActivationDate) : new Date();
      let expiryDate = formData.tokenExpiresAt ? new Date(formData.tokenExpiresAt) : new Date();

      if (expiryDate <= activationDate) {
        toast.warning("Expiry date must be after activation date");
        setIsSubmitting(false);
        return;
      }

      const maxExpiryDate = new Date(activationDate);
      maxExpiryDate.setDate(activationDate.getDate() + 365);

      if (expiryDate > maxExpiryDate) {
        toast.warning("Expiry date limited to maximum 365 days from activation date");
        expiryDate = maxExpiryDate;
      }

      const restaurantRef = doc(db, "restaurants", params.id);

      // Update Firestore document
      const updateData: any = {
        name: formData.name,
        ownerName: formData.ownerName,
        email: formData.email,
        isActive: formData.isActive,
        activationToken: formData.activationToken,
        tokenActivationDate: activationDate.toISOString(),
        tokenExpiresAt: expiryDate.toISOString(),
        lastUpdated: new Date(),
      };

      await updateDoc(restaurantRef, updateData);

      // Update email and/or password via server-side API if changed
      if (formData.email !== originalEmail || password) {
        const response = await fetch("/api/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: params.id,
            email: formData.email !== originalEmail ? formData.email : undefined,
            password: password || undefined,
            userRole,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update user");
        }
      }

      toast.success("Restaurant updated successfully");
      router.push("/admin/restaurants");
    } catch (error: any) {
      console.error("Error updating restaurant:", error);
      toast.error(error.message || "Failed to update restaurant");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/admin/restaurants")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Restaurants
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Restaurant</CardTitle>
          <CardDescription>Update restaurant details and activation settings.</CardDescription>
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

            <div className="flex items-center justify-between space-y-0 pt-2">
              <Label htmlFor="isActive">Account Status</Label>
              <div className="flex items-center gap-2">
                <span className={formData.isActive ? "text-green-600" : "text-red-600"}>
                  {formData.isActive ? "Active" : "Inactive"}
                </span>
                <Switch id="isActive" checked={formData.isActive} onCheckedChange={handleSwitchChange} />
              </div>
            </div>

            <div className="pt-4 border-t mt-4">
              <h3 className="font-medium mb-4">Activation Settings</h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between space-y-0">
                  <Label htmlFor="regenerateToken">Regenerate Activation Token</Label>
                  <Switch
                    id="regenerateToken"
                    checked={regenerateToken}
                    onCheckedChange={handleRegenerateTokenChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {regenerateToken
                    ? "A new token has been generated. You can refresh it again or turn off to revert to the original."
                    : "Enable to generate a new activation token."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="activationToken">
                    {regenerateToken ? "New Activation Token" : "Current Activation Token"}
                  </Label>
                  {regenerateToken && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={handleManualTokenRefresh}
                      disabled={isTokenRefreshing}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isTokenRefreshing ? "animate-spin" : ""}`} />
                      Refresh Token
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="activationToken"
                    value={formData.activationToken}
                    readOnly
                    className={`font-mono text-sm ${regenerateToken ? "bg-green-50 border-green-200" : "bg-muted"}`}
                  />
                  {regenerateToken && (
                    <div className="absolute right-3 top-2">
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">New</span>
                    </div>
                  )}
                </div>
                {regenerateToken && (
                  <p className="text-xs text-green-600">This new token will be saved when you submit the form.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenActivationDate">Activation Date</Label>
                  <div className="relative">
                    <Input
                      id="tokenActivationDate"
                      name="tokenActivationDate"
                      type="date"
                      value={formData.tokenActivationDate}
                      onChange={handleChange}
                      required
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokenExpiresAt">Expiry Date</Label>
                  <div className="relative">
                    <Input
                      id="tokenExpiresAt"
                      name="tokenExpiresAt"
                      type="date"
                      value={formData.tokenExpiresAt}
                      onChange={handleChange}
                      min={formData.tokenActivationDate}
                      required
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Maximum 365 days from activation date.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push("/admin/restaurants")}>
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}