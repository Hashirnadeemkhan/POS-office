// app/admin/restaurants/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";
import { generateActivationToken } from "@/lib/utils";

const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) return { isValid: false, message: "Password must be at least 8 characters long." };
  if (!/[A-Z]/.test(password)) return { isValid: false, message: "Password must contain at least one uppercase letter." };
  if (!/[0-9]/.test(password)) return { isValid: false, message: "Password must contain at least one number." };
  if (!/[^A-Za-z0-9]/.test(password)) return { isValid: false, message: "Password must contain at least one special character." };
  return { isValid: true, message: "" };
};

export default function CreateRestaurantPage() {
  const today = new Date().toISOString().split("T")[0];
  const defaultExpiryDate = new Date();
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
  const defaultExpiryDateString = defaultExpiryDate.toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    ownerName: "",
    address: "",
    phoneNumber: "",
    activationToken: "",
    activationDate: today,
    expiryDate: defaultExpiryDateString,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validatePassword(formData.password);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/restaurants/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          ownerName: formData.ownerName,
          address: formData.address,
          phoneNumber: formData.phoneNumber,
          activationDate: formData.activationDate,
          expiryDate: formData.expiryDate,
          activationToken: formData.activationToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create restaurant");
      }

      setCreatedToken(data.activationToken);
      toast.success("Restaurant account created successfully");
    } catch (error: any) {
      console.error("Error creating restaurant:", error);
      toast.error(error.message || "Failed to create restaurant account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    router.push("/admin/restaurants");
  };
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
              The restaurant account has been created successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-md bg-muted">
              <h3 className="font-medium mb-2">Activation Token</h3>
              <p className="font-mono text-sm break-all bg-background p-2 rounded">{createdToken}</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Activation Date:</span> {new Date(formData.activationDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Expiry Date:</span> {new Date(formData.expiryDate).toLocaleDateString()}
                  </p>
                </div>
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
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter restaurant address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter phone number"
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

              {/* Update the password help text */}
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
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters with one uppercase letter, one number, and one special
                  character.
                </p>
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
  );
}