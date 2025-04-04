"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Pencil, Trash2, ChevronDown, ChevronUp, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { collection, query, getDocs, deleteDoc, doc, where, orderBy, onSnapshot } from "firebase/firestore"
import { posDb } from "@/firebase/client"
import { toast } from "sonner"
import { DeleteProductDialog } from "@/src/components/DeleteProductDialog"
import { deleteImage, getImageIdFromUrl } from "@/lib/imageStorage"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context" // Import useAuth to get restaurantId

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
  image_url?: string
  productRestaurantId?: string // Add this field
}

interface Product {
  id: string
  name: string
  sku: string
  base_price?: number
  quantity?: number
  description?: string
  status?: "active" | "inactive"
  category?: string
  subcategory?: string
  variants: Variant[]
  main_image_url?: string
  gallery_images?: string[]
  restaurantId?: string // Add this field
}

interface Category {
  id: string
  name: string
  restaurantId?: string // Add this field
}

interface Subcategory {
  id: string
  name: string
  categoryId: string
  restaurantId?: string // Add this field
}

export default function ProductsPage() {
  const router = useRouter()
  const { user } = useAuth() // Get the logged-in user
  const restaurantId = user?.uid // Get the restaurantId

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
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

  // Fetch categories (restaurant-specific)
  useEffect(() => {
    if (!restaurantId) return

    const q = query(
      collection(posDb, "categories"),
      where("restaurantId", "==", restaurantId), // Add restaurantId filter
      orderBy("name"),
    )
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const categoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          restaurantId: doc.data().restaurantId,
        }))
        setCategories(categoriesList)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast.error("Failed to load categories.")
      },
    )
    return () => unsubscribe()
  }, [restaurantId])

  // Fetch subcategories (restaurant-specific)
  useEffect(() => {
    if (!restaurantId) return

    const q = query(
      collection(posDb, "subcategories"),
      where("restaurantId", "==", restaurantId), // Add restaurantId filter
      orderBy("name"),
    )
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const subcategoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          categoryId: doc.data().categoryId,
          restaurantId: doc.data().restaurantId,
        }))
        setSubcategories(subcategoriesList)
      },
      (error) => {
        console.error("Error fetching subcategories:", error)
        toast.error("Failed to load subcategories.")
      },
    )
    return () => unsubscribe()
  }, [restaurantId])

  // Fetch products, variants, and attributes (restaurant-specific)
  useEffect(() => {
    if (!restaurantId) return

    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        let q = query(
          collection(posDb, "products"),
          where("restaurantId", "==", restaurantId), // Add restaurantId filter
          orderBy("name"),
        )

        if (filterCategory && filterCategory !== "all") {
          q = query(q, where("category", "==", filterCategory))
        }

        if (filterSubcategory && filterSubcategory !== "all") {
          q = query(q, where("subcategory", "==", filterSubcategory))
        }

        const unsubscribe = onSnapshot(
          q,
          async (querySnapshot) => {
            const productsData: Product[] = []

            for (const docSnapshot of querySnapshot.docs) {
              const productData = docSnapshot.data()

              // Fetch variants for this product
              const variantsQuery = query(
                collection(posDb, "variants"),
                where("product_id", "==", docSnapshot.id),
                where("productRestaurantId", "==", restaurantId), // Add restaurantId filter
              )
              const variantsSnapshot = await getDocs(variantsQuery)
              const variants: Variant[] = []

              for (const variantDoc of variantsSnapshot.docs) {
                const variantData = variantDoc.data()

                // Fetch attributes for this variant
                const attributesQuery = query(
                  collection(posDb, "variant_attributes"),
                  where("variant_id", "==", variantDoc.id),
                  where("variantRestaurantId", "==", restaurantId), // Add restaurantId filter
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
                  image_url: variantData.image_url || "",
                  productRestaurantId: variantData.productRestaurantId,
                })
              }

              productsData.push({
                id: docSnapshot.id,
                name: productData.name || "",
                sku: productData.sku || "",
                base_price: productData.base_price,
                quantity: productData.quantity,
                description: productData.description,
                status: productData.status,
                category: productData.category,
                subcategory: productData.subcategory,
                variants,
                main_image_url: productData.main_image_url || "",
                gallery_images: productData.gallery_images || [],
                restaurantId: productData.restaurantId,
              })
            }

            setProducts(productsData)
            setIsLoading(false)
          },
          (error) => {
            console.error("Error fetching products:", error)
            toast.error("Failed to load products")
            setIsLoading(false)
          },
        )

        return () => unsubscribe()
      } catch (error) {
        console.error("Error setting up products listener:", error)
        toast.error("Failed to set up products listener.")
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [restaurantId, filterCategory, filterSubcategory])

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (selectedProduct) {
      try {
        // Delete all variant attributes and images
        for (const variant of selectedProduct.variants) {
          if (variant.image_url) {
            await deleteImage(getImageIdFromUrl(variant.image_url) || "")
          }

          const attributesQuery = query(
            collection(posDb, "variant_attributes"),
            where("variant_id", "==", variant.id),
            where("variantRestaurantId", "==", restaurantId),
          )
          const attributesSnapshot = await getDocs(attributesQuery)

          for (const attrDoc of attributesSnapshot.docs) {
            await deleteDoc(doc(posDb, "variant_attributes", attrDoc.id))
          }

          await deleteDoc(doc(posDb, "variants", variant.id))
        }

        // Delete product images
        if (selectedProduct.main_image_url) {
          await deleteImage(getImageIdFromUrl(selectedProduct.main_image_url) || "")
        }

        if (selectedProduct.gallery_images && selectedProduct.gallery_images.length > 0) {
          for (const imageUrl of selectedProduct.gallery_images) {
            await deleteImage(getImageIdFromUrl(imageUrl) || "")
          }
        }

        // Delete the product
        await deleteDoc(doc(posDb, "products", selectedProduct.id))

        setProducts(products.filter((p) => p.id !== selectedProduct.id))
        toast.success(`${selectedProduct.name} has been deleted`)
        setIsDeleteDialogOpen(false)
      } catch (error) {
        console.error("Error deleting product:", error)
        toast.error("Failed to delete product")
      }
    }
  }

  // Filter and paginate products
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Update total pages whenever filtered products change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
    if (currentPage > Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)) {
      setCurrentPage(1)
    }
  }, [filteredProducts, currentPage])

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  if (!restaurantId) {
    return <div>Please log in to view products.</div>
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Products</h1>
          <Button onClick={() => router.push("/pos/products/add")}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Search and Filters */}
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-2 border rounded-md"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={filterSubcategory}
                onChange={(e) => setFilterSubcategory(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All Subcategories</option>
                {subcategories
                  .filter(
                    (subcat) =>
                      filterCategory === "all" ||
                      subcat.categoryId === categories.find((cat) => cat.name === filterCategory)?.id,
                  )
                  .map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.name}>
                      {subcategory.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="w-full">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 text-center py-3"></th>
                  <th className="text-center py-3 w-16">Image</th>
                  <th className="text-center py-3">Name</th>
                  <th className="text-center py-3">SKU</th>
                  <th className="text-center py-3">Base Price</th>
                  <th className="text-center py-3">Quantity</th>
                  <th className="text-center py-3">Category</th>
                  <th className="text-center py-3">Status</th>
                  <th className="text-center py-3">Variants</th>
                  <th className="text-center py-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      Loading products...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
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
                        <td className="text-center py-3">
                          {product.main_image_url ? (
                            <div className="relative w-12 h-12 mx-auto rounded-md overflow-hidden">
                              <Image
                                src={product.main_image_url || "/placeholder.svg"}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 mx-auto bg-gray-100 flex items-center justify-center rounded-md">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="text-center py-3">{product.name}</td>
                        <td className="text-center py-3">{product.sku}</td>
                        <td className="text-center py-3">
                          {product.base_price !== undefined ? `$${product.base_price.toFixed(2)}` : "N/A"}
                        </td>
                        <td className="text-center py-3">
                          {product.quantity !== undefined ? product.quantity : "N/A"}
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
                              onClick={() => router.push(`/pos/products/edit/${product.id}`)}
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
                          <td colSpan={9} className="p-0">
                            <div className="bg-gray-50 p-4">
                              {product.gallery_images && product.gallery_images.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-2">Product Gallery</h4>
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                    {product.gallery_images.map((imageUrl, index) => (
                                      <div
                                        key={index}
                                        className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden"
                                      >
                                        <Image
                                          src={imageUrl || "/placeholder.svg"}
                                          alt={`${product.name} gallery ${index + 1}`}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <h4 className="text-sm font-medium mb-2">Variants</h4>
                              <div className="space-y-2">
                                {product.variants.map((variant) => (
                                  <div key={variant.id} className="bg-white p-3 rounded border">
                                    <div className="flex items-center gap-4">
                                      {variant.image_url ? (
                                        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                          <Image
                                            src={variant.image_url || "/placeholder.svg"}
                                            alt={variant.name}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-md flex-shrink-0">
                                          <ImageIcon className="h-6 w-6 text-gray-400" />
                                        </div>
                                      )}
                                      <div className="flex-1">
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
                                    </div>
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

