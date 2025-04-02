"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { adminAuth, adminDb, adminApp } from "@/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { getFunctions, httpsCallable } from "firebase/functions";

const validatePassword = (password: string) => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };
};

// Define the expected response type from the Cloud Function
interface UpdatePasswordResponse {
  success: boolean;
  message?: string;
}

export default function EditAdminPage({ params }: { params: { id: string } }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "admin",
  });
  const [password, setPassword] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { id } = params;
  const { userRole } = useAuth();
  const functions = getFunctions(adminApp, "us-central1"); // Specify region explicitly

  useEffect(() => {
    if (userRole !== "superadmin") {
      toast.error("Only Super Admins can edit admin accounts");
      router.push("/admin/dashboard");
      return;
    }

    const fetchAdmin = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(adminDb, "adminUsers", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || "",
            email: data.email || "",
            role: data.role || "admin",
          });
        } else {
          toast.error("Admin account not found");
          router.push("/admin/admins");
        }
      } catch (error) {
        console.error("Error fetching admin:", error);
        toast.error("Failed to load admin account");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdmin();
  }, [id, router, userRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordValidation(validatePassword(value));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password) {
      const validation = validatePassword(password);
      const isPasswordValid = Object.values(validation).every(Boolean);
      if (!isPasswordValid) {
        toast.error("Password must meet all requirements");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const docRef = doc(adminDb, "adminUsers", id);
      const originalDoc = await getDoc(docRef);
      const originalData = originalDoc.data();

      const updateData: any = {
        name: formData.name,
        role: formData.role,
        lastUpdated: serverTimestamp(),
      };

      if (formData.email !== originalData?.email) {
        updateData.email = formData.email;
        // Note: Email updates require Admin SDK; this only updates Firestore
      }

      if (password) {
        const updateAdminPassword = httpsCallable<
          { adminId: string; newPassword: string },
          UpdatePasswordResponse
        >(functions, "updateAdminPassword");
        
        const result = await updateAdminPassword({
          adminId: id,
          newPassword: password,
        });
        
        // Now TypeScript knows result.data has a success property
        if (result.data.success) {
          toast.success("Password updated successfully - old password will no longer work");
        } else {
          throw new Error(result.data.message || "Failed to update password");
        }
      }

      await updateDoc(docRef, updateData);
      toast.success("Admin account updated successfully");
      router.push("/admin/admins");
    } catch (error: unknown) {
      console.error("Error updating admin:", error);
      
      if (error instanceof Error) {
        toast.error(error.message || "Failed to update admin account");
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPasswordValid = password ? Object.values(passwordValidation).every(Boolean) : true;

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
            Update admin account details. New password will replace the existing one if provided.
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                disabled={isSubmitting}
              />
              {password && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className={passwordValidation.length ? "text-green-600" : "text-red-600"}>
                    ✓ At least 8 characters
                  </p>
                  <p className={passwordValidation.uppercase ? "text-green-600" : "text-red-600"}>
                    ✓ One uppercase letter
                  </p>
                  <p className={passwordValidation.number ? "text-green-600" : "text-red-600"}>
                    ✓ One number
                  </p>
                  <p className={passwordValidation.special ? "text-green-600" : "text-red-600"}>
                    ✓ One special character (!@#$%^&*)
                  </p>
                </div>
              )}
              {!password && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep current password. If set, must include 8+ characters, uppercase, number, and special character.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange} disabled={isSubmitting}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting || !isPasswordValid}
            >
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
  );
}