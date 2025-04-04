"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminAuth, adminDb } from "@/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserProfile {
  displayName: string;
  email: string;
  role: "admin" | "superadmin";
}

export default function EditProfile() {
  const router = useRouter();
  const { userId, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    role: "admin",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const user = adminAuth.currentUser;

        if (!user) {
          router.push("/admin/login");
          return;
        }

        const userDoc = await getDoc(doc(adminDb, "adminUsers", userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        setProfile({
          displayName: user.displayName || userData.name || "",
          email: user.email || "",
          role: userRole || userData.role || "admin",
        });
      } catch (error: unknown) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, userRole, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: "admin" | "superadmin") => {
    setProfile((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("User ID is missing");
      return;
    }

    try {
      setSaving(true);
      let user = adminAuth.currentUser;
      if (!user) {
        // Attempt to refresh the token
        await adminAuth.currentUser?.getIdToken(true);
        user = adminAuth.currentUser;
        if (!user) {
          throw new Error("No authenticated user found. Please log in again.");
        }
      }
      console.log("userId from useAuth:", userId, "Firebase Auth UID:", user.uid);

      await updateProfile(user, { displayName: profile.displayName });

      const updateData: any = {
        name: profile.displayName,
      };

      if (userRole === "superadmin") {
        updateData.role = profile.role;
        updateData.email = profile.email;

        const hasEmailUpdate = profile.email && profile.email !== user.email;
        const hasPasswordUpdate = password && password.length >= 6;

        if (hasEmailUpdate || hasPasswordUpdate) {
          const apiPayload = {
            uid: user.uid,
            ...(hasEmailUpdate && { email: profile.email }),
            ...(hasPasswordUpdate && { password }),
          };

          console.log("Sending to /api/update-user:", apiPayload);

          const response = await fetch("/api/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(apiPayload),
          });

          const responseBody = await response.json();
          console.log("API Response:", response.status, responseBody);

          if (!response.ok) {
            throw new Error(responseBody.error || "Failed to update user");
          }
        }
      }

      await updateDoc(doc(adminDb, "adminUsers", userId), updateData);

      toast.success("Profile updated successfully");
      router.push("/admin/profile/view");
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      
      // Type guard to safely access error properties
      if (error instanceof Error) {
        toast.error(error.message || "Failed to update profile");
        if (error.message.includes("user-token-expired") || error.message.includes("No authenticated user")) {
          router.push("/admin/login");
        }
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
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
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="Your email"
                disabled={userRole !== "superadmin"}
              />
            </div>

            {userRole === "superadmin" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password (optional)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={profile.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="button" variant="outline" className="mr-2" onClick={() => router.push("/admin/profile/view")}>
              Cancel
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}