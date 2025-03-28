"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Package, ShoppingBag, Tag } from "lucide-react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price?: number;
  status?: "active" | "inactive";
  category?: string;
  main_image_url?: string;
  created_at?: Date;
}

interface LicenseInfo {
  activationDate: Date;
  expiryDate: Date;
  remainingDays: number;
}

export default function PosDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [categoryCount, setCategoryCount] = useState(0);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>({
    activationDate: new Date(),
    expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 12)),
    remainingDays: 365,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch data regardless of authentication status
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch total products
      const productsQuery = query(collection(db, "products"));
      const productsSnapshot = await getDocs(productsQuery);
      console.log("Products fetched:", productsSnapshot.docs.length);
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
      })) as Product[];
      setProducts(productsData);

      // Fetch top 10 recent products
      const recentQuery = query(collection(db, "products"), orderBy("created_at", "desc"), limit(10));
      const recentSnapshot = await getDocs(recentQuery);
      console.log("Recent products fetched:", recentSnapshot.docs.length);
      const recentData = recentSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Product",
        sku: doc.data().sku || "N/A",
        base_price: doc.data().base_price ?? 0,
        status: doc.data().status || "inactive",
        category: doc.data().category || "Uncategorized",
        main_image_url: doc.data().main_image_url || "",
        created_at: doc.data().created_at?.toDate() || new Date(),
      })) as Product[];
      setRecentProducts(recentData);

      // Fetch categories
      const categoriesQuery = query(collection(db, "categories"));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      console.log("Categories fetched:", categoriesSnapshot.size);
      setCategoryCount(categoriesSnapshot.size);

      // Fetch license info with fallback
      const licenseQuery = query(collection(db, "license"));
      const licenseSnapshot = await getDocs(licenseQuery);
      console.log("License docs fetched:", licenseSnapshot.docs.length);
      let activationDate = new Date();
      let expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      if (!licenseSnapshot.empty) {
        const licenseData = licenseSnapshot.docs[0].data();
        activationDate = licenseData.activationDate?.toDate() || new Date();
        expiryDate = licenseData.expiryDate?.toDate() || new Date(activationDate.setFullYear(activationDate.getFullYear() + 1));
      }

      const remainingDays = Math.max(0, Math.ceil(
        (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ));

      setLicenseInfo({
        activationDate,
        expiryDate,
        remainingDays,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please check your connection or permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600">
        {error}
      </div>
    );
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
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Products</CardTitle>
                <CardDescription>The latest 10 products added to your inventory</CardDescription>
              </div>
              <Link href="/pos/products">
                <Button className="bg-purple-500 text-white hover:bg-purple-600 hover:text-white" variant="outline">View All Products</Button>
              </Link>
            </div>
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
                      No recent products found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.main_image_url ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden">
                            <Image
                              src={product.main_image_url}
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
                        <Badge
                          variant={product.status === "active" ? "default" : "secondary"}
                          className={
                            product.status === "active"
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-red-500 text-white hover:bg-red-600"
                          }
                        >
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
  );
}