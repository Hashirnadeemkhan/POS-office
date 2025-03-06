"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PlusCircle, Trash2, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { collection, doc, getDoc, getDocs, query, updateDoc, where, addDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Define the attribute interface
interface VariantAttribute {
  id?: string
  key: string
  value: string
}

// Define the variant interface with the correct attribute type
interface Variant {
  id?: string
  name: string
  price: string
  stock: string
  attributes: VariantAttribute[]
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params?.id as string

  // Base product information
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  // Variants
  const [variants, setVariants] = useState<Variant[]>([])

  // Categories
  const [category, setCategory] = useState("")
  const [subcategory, setSubcategory] = useState("")

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return

      try {
        // Fetch product data
        const productDoc = await getDoc(doc(db, "products", productId))

        if (!productDoc.exists()) {
          toast.error("Product not found")
          router.push("/products")
          return
        }

        const productData = productDoc.data()

        // Set product base data
        setName(productData.name || "")
        setSku(productData.sku || "")
        setBasePrice(productData.base_price?.toString() || "")
        setDescription(productData.description || "")
        setStatus(productData.status || "active")
        setCategory(productData.category || "")
        setSubcategory(productData.subcategory || "")

        // Fetch variants
        const variantsQuery = query(collection(db, "variants"), where("product_id", "==", productId))
        const variantsSnapshot = await getDocs(variantsQuery)

        const variantsData: Variant[] = []

        for (const variantDoc of variantsSnapshot.docs) {
          const variantData = variantDoc.data()

          // Fetch attributes for this variant
          const attributesQuery = query(collection(db, "variant_attributes"), where("variant_id", "==", variantDoc.id))
          const attributesSnapshot = await getDocs(attributesQuery)

          const attributes: VariantAttribute[] = attributesSnapshot.docs.map((attrDoc) => ({
            id: attrDoc.id,
            key: attrDoc.data().key_name || "",
            value: attrDoc.data().value_name || "",
          }))

          // If no attributes were found, add a default empty one
          if (attributes.length === 0) {
            attributes.push({ key: "", value: "" })
          }

          variantsData.push({
            id: variantDoc.id,
            name: variantData.name || "",
            price: variantData.price?.toString() || "",
            stock: variantData.stock?.toString() || "",
            attributes,
          })
        }

        // If no variants were found, add a default empty one
        if (variantsData.length === 0) {
          variantsData.push({
            name: "",
            price: "",
            stock: "",
            attributes: [{ key: "", value: "" }],
          })
        }

        setVariants(variantsData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching product:", error)
        toast.error("Failed to load product data")
        router.push("/products")
      }
    }

    fetchProduct()
  }, [productId, router])

  // Add a new variant
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: "",
        price: "",
        stock: "",
        attributes: [{ key: "", value: "" }],
      },
    ])
  }

  // Remove a variant
  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      const newVariants = [...variants]
      newVariants.splice(index, 1)
      setVariants(newVariants)
    } else {
      toast.error("Product must have at least one variant")
    }
  }

  // Update variant field
  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const newVariants = [...variants]
    newVariants[index] = {
      ...newVariants[index],
      [field]: value,
    }
    setVariants(newVariants)
  }

  // Add attribute to variant
  const addAttribute = (variantIndex: number) => {
    const newVariants = [...variants]
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      attributes: [...newVariants[variantIndex].attributes, { key: "", value: "" }],
    }
    setVariants(newVariants)
  }

  // Remove attribute from variant
  const removeAttribute = (variantIndex: number, attrIndex: number) => {
    const newVariants = [...variants]
    if (newVariants[variantIndex].attributes.length > 1) {
      const newAttributes = [...newVariants[variantIndex].attributes]
      newAttributes.splice(attrIndex, 1)
      newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        attributes: newAttributes,
      }
      setVariants(newVariants)
    }
  }

  // Update attribute
  const updateAttribute = (variantIndex: number, attrIndex: number, field: keyof VariantAttribute, value: string) => {
    const newVariants = [...variants]
    const newAttributes = [...newVariants[variantIndex].attributes]
    newAttributes[attrIndex] = {
      ...newAttributes[attrIndex],
      [field]: value,
    }
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      attributes: newAttributes,
    }
    setVariants(newVariants)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate base product
      if (!name || !sku || !basePrice) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      // Validate variants
      for (const variant of variants) {
        if (!variant.name || !variant.price || !variant.stock) {
          toast.error("Please fill in all variant fields")
          setIsSubmitting(false)
          return
        }

        for (const attr of variant.attributes) {
          if (!attr.key || !attr.value) {
            toast.error("Please fill in all attribute fields")
            setIsSubmitting(false)
            return
          }
        }
      }

      // Update product in Firestore
      await updateDoc(doc(db, "products", productId), {
        name,
        sku,
        base_price: Number.parseFloat(basePrice),
        description,
        status,
        category,
        subcategory,
        updated_at: new Date(),
      })

      // Process variants
      for (const variant of variants) {
        if (variant.id) {
          // Update existing variant
          await updateDoc(doc(db, "variants", variant.id), {
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
          })

          // Get existing attributes
          const attributesQuery = query(collection(db, "variant_attributes"), where("variant_id", "==", variant.id))
          const attributesSnapshot = await getDocs(attributesQuery)

          // Create a set of existing attribute IDs
          const existingAttributeIds: string[] = []
          const processedAttributeIds: string[] = []

          attributesSnapshot.docs.forEach((doc) => {
            existingAttributeIds.push(doc.id)
          })

          // Process attributes
          for (const attr of variant.attributes) {
            if (attr.id) {
              // Update existing attribute
              await updateDoc(doc(db, "variant_attributes", attr.id), {
                key_name: attr.key,
                value_name: attr.value,
              })

              // Mark as processed
              processedAttributeIds.push(attr.id)
            } else {
              // Add new attribute
              await addDoc(collection(db, "variant_attributes"), {
                variant_id: variant.id,
                key_name: attr.key,
                value_name: attr.value,
              })
            }
          }

          // Delete attributes that no longer exist
          for (const attrId of existingAttributeIds) {
            if (!processedAttributeIds.includes(attrId)) {
              await deleteDoc(doc(db, "variant_attributes", attrId))
            }
          }
        } else {
          // Add new variant
          const variantRef = await addDoc(collection(db, "variants"), {
            product_id: productId,
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
          })

          // Add attributes for this variant
          for (const attr of variant.attributes) {
            await addDoc(collection(db, "variant_attributes"), {
              variant_id: variantRef.id,
              key_name: attr.key,
              value_name: attr.value,
            })
          }
        }
      }

      toast.success("Product updated successfully")
      router.push("/products")
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Failed to update product")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading product data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Base Product Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Enter unique SKU"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">
                  Base Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="status"
                    checked={status === "active"}
                    onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
                  />
                  <span>{status === "active" ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="food">Food & Beverages</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select value={subcategory} onValueChange={setSubcategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {category === "electronics" && (
                      <>
                        <SelectItem value="phones">Phones</SelectItem>
                        <SelectItem value="computers">Computers</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </>
                    )}
                    {category === "clothing" && (
                      <>
                        <SelectItem value="shirts">Shirts</SelectItem>
                        <SelectItem value="pants">Pants</SelectItem>
                        <SelectItem value="shoes">Shoes</SelectItem>
                      </>
                    )}
                    {category === "food" && (
                      <>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="snacks">Snacks</SelectItem>
                        <SelectItem value="meals">Meals</SelectItem>
                      </>
                    )}
                    {category === "furniture" && (
                      <>
                        <SelectItem value="chairs">Chairs</SelectItem>
                        <SelectItem value="tables">Tables</SelectItem>
                        <SelectItem value="beds">Beds</SelectItem>
                      </>
                    )}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Product Variants</CardTitle>
            <Button type="button" onClick={addVariant} variant="outline" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {variants.map((variant, variantIndex) => (
              <div key={variantIndex} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Variant {variantIndex + 1}</h3>
                  {variants.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeVariant(variantIndex)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`variant-name-${variantIndex}`}>
                      Variant Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`variant-name-${variantIndex}`}
                      value={variant.name}
                      onChange={(e) => updateVariant(variantIndex, "name", e.target.value)}
                      placeholder="e.g. Small, Red, 2.5L"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`variant-price-${variantIndex}`}>
                      Price <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`variant-price-${variantIndex}`}
                      type="number"
                      step="0.01"
                      value={variant.price}
                      onChange={(e) => updateVariant(variantIndex, "price", e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`variant-stock-${variantIndex}`}>
                      Stock <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id={`variant-stock-${variantIndex}`}
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateVariant(variantIndex, "stock", e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Attributes</Label>
                    <Button type="button" onClick={() => addAttribute(variantIndex)} variant="outline" size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Attribute
                    </Button>
                  </div>

                  {variant.attributes.map((attr, attrIndex) => (
                    <div key={attrIndex} className="flex items-center gap-2">
                      <Input
                        value={attr.key}
                        onChange={(e) => updateAttribute(variantIndex, attrIndex, "key", e.target.value)}
                        placeholder="Attribute (e.g. Size, Color)"
                        className="flex-1"
                      />
                      <Input
                        value={attr.value}
                        onChange={(e) => updateAttribute(variantIndex, attrIndex, "value", e.target.value)}
                        placeholder="Value (e.g. Large, Red)"
                        className="flex-1"
                      />
                      {variant.attributes.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeAttribute(variantIndex, attrIndex)}
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Update Product"}
          </Button>
        </div>
      </form>
    </div>
  )
}

