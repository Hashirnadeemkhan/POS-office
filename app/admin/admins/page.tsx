"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  createdAt: any
}

export default function AdminsPage() {
  const { userId, userRole, loading: authLoading } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const router = useRouter()

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading && (!userId || !userRole)) {
      toast.error("You must be an admin to access this page.")
      router.push("/admin/login")
    }
  }, [authLoading, userId, userRole, router])

  useEffect(() => {
    if (userId && userRole) {
      fetchAdmins()
    }
  }, [userId, userRole])

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const q = query(collection(db, "adminUsers"), where("role", "in", ["admin", "superadmin"]))
      const querySnapshot = await getDocs(q)

      const adminsList: AdminUser[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        adminsList.push({
          id: doc.id,
          email: data.email,
          name: data.name || "N/A",
          role: data.role,
          createdAt: data.createdAt,
        })
      })

      setAdmins(adminsList)
    } catch (error) {
      console.error("Error fetching admins:", error)
      toast.error("Failed to load admin accounts")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(id)
      await deleteDoc(doc(db, "adminUsers", id))
      setAdmins(admins.filter(admin => admin.id !== id))
      toast.success("Admin account deleted successfully")
    } catch (error) {
      console.error("Error deleting admin:", error)
      toast.error("Failed to delete admin account")
    } finally {
      setDeleteLoading(null)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString()
    } catch (error) {
      return "Invalid date"
    }
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!userId || !userRole) {
    return null // Redirected via useEffect
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Accounts</h1>
        <Button onClick={() => router.push("/admin/admins/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Admin Accounts</CardTitle>
          <CardDescription>
            Manage all admin accounts in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No admin accounts found. Create your first admin account.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.role === "superadmin" 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {admin.role === "superadmin" ? "Super Admin" : "Admin"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(admin.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/admin/admins/edit/${admin.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the admin account for {admin.email}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(admin.id)}
                                disabled={deleteLoading === admin.id}
                              >
                                {deleteLoading === admin.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}