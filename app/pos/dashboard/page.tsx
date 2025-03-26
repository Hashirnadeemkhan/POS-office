"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Package, ShoppingBag, Tag } from "lucide-react"
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Image from "next/image"

interface Product {
  id: string
  name: string
  sku: string
  base_price?: number
  status?: "active" | "inactive"
  category?: string
  main_image_url?: string
  createdAt?: Date
}

interface LicenseInfo {
  activationDate: Date
  expiryDate: Date
  remainingDays: number
}

export default function PosDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [recentProducts, setRecentProducts] = useState<Product[]>([])
  const [categoryCount, setCategoryCount] = useState(0)
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>({
    activationDate: new Date(),
    expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 12)),
    remainingDays: 365,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const productsQuery = query(collection(db, "products"))
        const productsSnapshot = await getDocs(productsQuery)
        const productsData = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
        setProducts(productsData)

        // Fetch recent products
        const recentProductsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(10))
        const recentProductsSnapshot = await getDocs(recentProductsQuery)
        const recentProductsData = recentProductsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]
        setRecentProducts(recentProductsData)

        // Fetch categories
        const categoriesQuery = query(collection(db, "categories"))
        const categoriesSnapshot = await getDocs(categoriesQuery)
        setCategoryCount(categoriesSnapshot.size)

        // Fetch license information
        const licenseQuery = query(collection(db, "license"))
        const licenseSnapshot = await getDocs(licenseQuery)
        const licenseData = licenseSnapshot.docs.map((doc) => doc.data())[0]

        const activationDate = licenseData?.activationDate.toDate() || new Date()
        const expiryDate = new Date(activationDate.getTime())
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)

        const remainingDays = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

        setLicenseInfo({
          activationDate,
          expiryDate,
          remainingDays,
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Badge variant="outline" className="px-3 py-1">
            {licenseInfo.remainingDays > 30 ? "Active" : "Expiring Soon"}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {products.filter((p) => p.status === "active").length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categoryCount}</div>
              <p className="text-xs text-muted-foreground">Product organization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Activation Date</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDate(licenseInfo.activationDate)}</div>
              <p className="text-xs text-muted-foreground">start date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">License Status</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{licenseInfo.remainingDays} days</div>
              <p className="text-xs text-muted-foreground">Expires on {formatDate(licenseInfo.expiryDate)}</p>
            </CardContent>
          </Card>
        </div>

        {/* License Information */}
        <Card>
          <CardHeader>
            <CardTitle>License Information</CardTitle>
            <CardDescription>Details about your POS system license</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Activation Date</h3>
                  <p className="text-lg font-semibold">{formatDate(licenseInfo.activationDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Expiry Date</h3>
                  <p className="text-lg font-semibold">{formatDate(licenseInfo.expiryDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Remaining Days</h3>
                  <p className="text-lg font-semibold">{licenseInfo.remainingDays} days</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge variant={licenseInfo.remainingDays > 30 ? "default" : "destructive"} className="mt-1">
                    {licenseInfo.remainingDays > 30 ? "Active" : "Expiring Soon"}
                  </Badge>
                </div>
              </div>

              {licenseInfo.remainingDays < 30 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm">
                  Your license will expire soon. Please renew your subscription to continue using all features.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Products</CardTitle>
            <CardDescription>The latest 10 products added to your inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.main_image_url ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden">
                            <Image
                              src={product.main_image_url || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>
                        {product.base_price !== undefined ? `$${product.base_price.toFixed(2)}` : "N/A"}
                      </TableCell>
                      <TableCell>{product.category || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === "active" ? "default" : "secondary"}>
                          {product.status || "N/A"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}