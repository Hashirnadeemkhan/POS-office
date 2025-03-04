"use client"
import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ProductFilter } from "@/src/components/ProductFilter"
import { DeleteProductDialog } from "@/src/components/DeleteProductDialog"
import { AddProductModal } from "@/src/components/AddProductModal"
import { EditProductModal } from "@/src/components/EditProductModal"
import { Pagination } from "@/components/ui/pagination"

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category: string
  subcategory: string
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterSubcategory, setFilterSubcategory] = useState<string>("all")

  const ITEMS_PER_PAGE = 10

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      let q = query(collection(db, "products"), orderBy("name"), limit(currentPage * ITEMS_PER_PAGE))

      if (filterCategory && filterCategory !== "all") {
        q = query(q, where("category", "==", filterCategory))
      }

      if (filterSubcategory && filterSubcategory !== "all") {
        q = query(q, where("subcategory", "==", filterSubcategory))
      }

      const querySnapshot = await getDocs(q)
      const productsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[]

      setProducts(productsList)

      // Get total count for pagination
      const totalCountSnapshot = await getDocs(collection(db, "products"))
      setTotalPages(Math.ceil(totalCountSnapshot.size / ITEMS_PER_PAGE))

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products.")
      setIsLoading(false)
    }
  }, [currentPage, filterCategory, filterSubcategory])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleAddProduct = async (product: Omit<Product, "id">) => {
    try {
      const docRef = await addDoc(collection(db, "products"), product)
      setProducts([...products, { id: docRef.id, ...product }])
      toast.success(`${product.name} has been added successfully.`)
      setIsAddModalOpen(false)
    } catch (error) {
      console.error("Error adding product:", error)
      toast.error("Failed to add product.")
    }
  }

  const handleUpdateProduct = async (id: string, updatedProduct: Omit<Product, "id">) => {
    try {
      const productRef = doc(db, "products", id)
      await updateDoc(productRef, updatedProduct)
      setProducts(products.map((product) => (product.id === id ? { id, ...updatedProduct } : product)))
      toast.success(`${updatedProduct.name} has been updated successfully.`)
      setIsEditModalOpen(false)
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Failed to update product.")
    }
  }

  const handleDeleteProduct = async () => {
    if (selectedProduct) {
      try {
        const productRef = doc(db, "products", selectedProduct.id)
        await deleteDoc(productRef)
        setProducts(products.filter((product) => product.id !== selectedProduct.id))
        toast.success(`${selectedProduct.name} has been deleted.`)
        setIsDeleteDialogOpen(false)
      } catch (error) {
        console.error("Error deleting product:", error)
        toast.error("Failed to delete product.")
      }
    }
  }

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleSearch}
            className="mr-2"
          />
          <Search className="h-4 w-4 text-gray-500" />
        </div>
        <ProductFilter onCategoryChange={setFilterCategory} onSubcategoryChange={setFilterSubcategory} />
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <Table>
          <TableCaption>A list of your products.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subcategory</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.subcategory}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        setSelectedProduct(product)
                        setIsEditModalOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => {
                        setSelectedProduct(product)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProduct}
      />
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateProduct={handleUpdateProduct}
        product={selectedProduct}
      />
      <DeleteProductDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProduct}
        productName={selectedProduct?.name || ""}
      />
    </div>
  )
}

