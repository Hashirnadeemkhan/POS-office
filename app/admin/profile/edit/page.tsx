// app/admin/profile/edit/page.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserProfile {
  displayName: string;
  email: string;
  phoneNumber: string;
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
    phoneNumber: "",
    role: "admin",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const user = auth.currentUser;

        if (!user) {
          router.push("/admin/login");
          return;
        }

        const userDoc = await getDoc(doc(db, "adminUsers", userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        setProfile({
          displayName: user.displayName || userData.name || "",
          email: user.email || "",
          phoneNumber: userData.phoneNumber || "",
          role: userRole || userData.role || "admin",
        });
      } catch (error: any) {
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
    if (!userId) return;

    try {
      setSaving(true);
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: profile.displayName });

        const updateData: any = {
          name: profile.displayName,
          phoneNumber: profile.phoneNumber,
        };

        if (userRole === "superadmin") {
          updateData.role = profile.role;
          updateData.email = profile.email;

          if (profile.email !== user.email || password) {
            const response = await fetch("/api/update-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: userId,
                email: profile.email !== user.email ? profile.email : undefined,
                password: password || undefined,
                userRole,
              }),
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || "Failed to update user");
            }
          }
        }

        await updateDoc(doc(db, "adminUsers", userId), updateData);

        toast.success("Profile updated successfully");
        router.push("/admin/profile/view");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
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
              <Input id="displayName" name="displayName" value={profile.displayName} onChange={handleChange} placeholder="Your full name" />
            </div>
            ...
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
