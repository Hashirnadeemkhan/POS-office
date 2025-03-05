"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, query, getDocs, deleteDoc, doc, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { DeleteProductDialog } from "@/src/components/DeleteProductDialog"

// Define interfaces for our data
interface VariantAttribute {
  id: string
  key_name: string
  value_name: string
}

interface Variant {
  id: string
  name: string
  price: number
  stock: number
  attributes: VariantAttribute[]
}

interface Product {
  id: string
  name: string
  sku: string
  base_price?: number
  description?: string
  status?: "active" | "inactive"
  category?: string
  subcategory?: string
  variants: Variant[]
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterSubcategory, setFilterSubcategory] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const ITEMS_PER_PAGE = 10

  // Toggle product expansion
  const toggleProductExpand = (productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, "products"))
        const querySnapshot = await getDocs(q)

        const uniqueCategories = new Set<string>()
        const uniqueSubcategories = new Set<string>()

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.category) uniqueCategories.add(data.category)
          if (data.subcategory) uniqueSubcategories.add(data.subcategory)
        })

        setCategories(Array.from(uniqueCategories))
        setSubcategories(Array.from(uniqueSubcategories))
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

    fetchCategories()
  }, [])

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        let q = query(collection(db, "products"), orderBy("name"))

        if (filterCategory && filterCategory !== "all") {
          q = query(q, where("category", "==", filterCategory))
        }

        if (filterSubcategory && filterSubcategory !== "all") {
          q = query(q, where("subcategory", "==", filterSubcategory))
        }

        const querySnapshot = await getDocs(q)
        const productsData: Product[] = []

        for (const docSnapshot of querySnapshot.docs) {
          const productData = docSnapshot.data()

          // Fetch variants for this product
          const variantsQuery = query(collection(db, "variants"), where("product_id", "==", docSnapshot.id))
          const variantsSnapshot = await getDocs(variantsQuery)
          const variants: Variant[] = []

          for (const variantDoc of variantsSnapshot.docs) {
            const variantData = variantDoc.data()

            // Fetch attributes for this variant
            const attributesQuery = query(
              collection(db, "variant_attributes"),
              where("variant_id", "==", variantDoc.id),
            )
            const attributesSnapshot = await getDocs(attributesQuery)
            const attributes = attributesSnapshot.docs.map((attrDoc) => ({
              id: attrDoc.id,
              ...attrDoc.data(),
            })) as VariantAttribute[]

            variants.push({
              id: variantDoc.id,
              name: variantData.name || "",
              price: variantData.price || 0,
              stock: variantData.stock || 0,
              attributes,
            })
          }

          productsData.push({
            id: docSnapshot.id,
            name: productData.name || "",
            sku: productData.sku || "",
            base_price: productData.base_price,
            description: productData.description,
            status: productData.status,
            category: productData.category,
            subcategory: productData.subcategory,
            variants,
          })
        }

        setProducts(productsData)

        // Get total count for pagination
        const totalCountSnapshot = await getDocs(collection(db, "products"))
        setTotalPages(Math.ceil(totalCountSnapshot.size / ITEMS_PER_PAGE))

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching products:", error)
        toast.error("Failed to load products")
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [filterCategory, filterSubcategory])

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (selectedProduct) {
      try {
        // Delete all variant attributes
        for (const variant of selectedProduct.variants) {
          const attributesQuery = query(collection(db, "variant_attributes"), where("variant_id", "==", variant.id))
          const attributesSnapshot = await getDocs(attributesQuery)

          for (const attrDoc of attributesSnapshot.docs) {
            await deleteDoc(doc(db, "variant_attributes", attrDoc.id))
          }

          // Delete the variant
          await deleteDoc(doc(db, "variants", variant.id))
        }

        // Delete the product
        await deleteDoc(doc(db, "products", selectedProduct.id))

        setProducts(products.filter((p) => p.id !== selectedProduct.id))
        toast.success(`${selectedProduct.name} has been deleted`)
        setIsDeleteDialogOpen(false)
      } catch (error) {
        console.error("Error deleting product:", error)
        toast.error("Failed to delete product")
      }
    }
  }

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={() => router.push("/products/add")}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Search and Filters */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterSubcategory} onValueChange={setFilterSubcategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subcategories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subcategories</SelectItem>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="w-full">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 text-center py-3"></th>
                  <th className="text-center py-3">Name</th>
                  <th className="text-center py-3">SKU</th>
                  <th className="text-center py-3">Base Price</th>
                  <th className="text-center py-3">Category</th>
                  <th className="text-center py-3">Status</th>
                  <th className="text-center py-3">Variants</th>
                  <th className="text-center py-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <React.Fragment key={product.id}>
                      <tr className="border-b">
                        <td className="text-center py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleProductExpand(product.id)}
                          >
                            {expandedProducts[product.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                        <td className="text-center py-3">{product.name}</td>
                        <td className="text-center py-3">{product.sku}</td>
                        <td className="text-center py-3">
                          {product.base_price !== undefined ? `$${product.base_price.toFixed(2)}` : "N/A"}
                        </td>
                        <td className="text-center py-3">{product.category || "N/A"}</td>
                        <td className="text-center py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {product.status || "N/A"}
                          </span>
                        </td>
                        <td className="text-center py-3">{product.variants.length}</td>
                        <td className="text-center py-3">
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/products/edit/${product.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedProducts[product.id] && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="bg-gray-50 p-4">
                              <h4 className="text-sm font-medium mb-2">Variants</h4>
                              <div className="space-y-2">
                                {product.variants.map((variant) => (
                                  <div key={variant.id} className="bg-white p-3 rounded border">
                                    <div className="flex justify-between items-center">
                                      <h5 className="font-medium">{variant.name}</h5>
                                      <div className="flex space-x-4 text-sm">
                                        <span>Price: ${variant.price.toFixed(2)}</span>
                                        <span>Stock: {variant.stock}</span>
                                      </div>
                                    </div>
                                    {variant.attributes.length > 0 && (
                                      <div className="mt-2">
                                        <h6 className="text-xs text-gray-500 mb-1">Attributes:</h6>
                                        <div className="flex flex-wrap gap-2">
                                          {variant.attributes.map((attr) => (
                                            <span
                                              key={attr.id}
                                              className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100"
                                            >
                                              {attr.key_name}: {attr.value_name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DeleteProductDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProduct}
        productName={selectedProduct?.name || ""}
      />
    </div>
  )
}

