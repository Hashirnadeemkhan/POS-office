"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Trash2, ArrowLeft, Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { collection, doc, getDoc, getDocs, updateDoc, query, where, addDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { saveImage, generateImageId, deleteImage, getImageIdFromUrl } from "@/lib/imageStorage"
import Image from "next/image"
import LocalImage from "@/src/components/LocalImage"

// Define the attribute interface
interface VariantAttribute {
  id?: string
  key_name?: string
  value_name?: string
  key: string
  value: string
}

// Define the variant interface
interface Variant {
  id: string
  name: string
  price: string
  stock: string
  attributes: VariantAttribute[]
  image_url?: string
  imageFile: File | null
  imagePreview: string
  isImageChanged: boolean
}

interface Product {
  id: string
  name: string
  sku: string
  base_price: string
  description: string
  status: "active" | "inactive"
  category: string
  subcategory: string
  main_image_url?: string
  gallery_images?: string[]
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const productId = params.id

  // Product state
  const [product, setProduct] = useState<Product>({
    id: productId,
    name: "",
    sku: "",
    base_price: "",
    description: "",
    status: "active",
    category: "",
    subcategory: "",
    main_image_url: "",
    gallery_images: [],
  })

  // Variants state
  const [variants, setVariants] = useState<Variant[]>([])
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([])
  const [deletedAttributeIds, setDeletedAttributeIds] = useState<string[]>([])

  // Product images
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState("")
  const [isMainImageChanged, setIsMainImageChanged] = useState(false)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [deletedGalleryImages, setDeletedGalleryImages] = useState<string[]>([])
  const [newGalleryImages, setNewGalleryImages] = useState<{ file: File; preview: string }[]>([])

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refs for file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const variantImageRefs = useRef<(HTMLInputElement | null)[]>([])

  // Create a ref callback for variant image inputs
  const setVariantImageRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      variantImageRefs.current[index] = el
    },
    [],
  )

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)

        // Fetch product data
        const productDoc = await getDoc(doc(db, "products", productId))

        if (!productDoc.exists()) {
          toast.error("Product not found")
          router.push("/products")
          return
        }

        const productData = productDoc.data()

        // Set product state
        setProduct({
          id: productId,
          name: productData.name || "",
          sku: productData.sku || "",
          base_price: productData.base_price?.toString() || "",
          description: productData.description || "",
          status: productData.status || "active",
          category: productData.category || "",
          subcategory: productData.subcategory || "",
          main_image_url: productData.main_image_url || "",
          gallery_images: productData.gallery_images || [],
        })

        // Set main image preview if exists
        if (productData.main_image_url && productData.main_image_url.startsWith("local-image://")) {
          setMainImagePreview(productData.main_image_url)
        }

        // Set gallery previews if exist
        if (productData.gallery_images && productData.gallery_images.length > 0) {
          setGalleryPreviews(productData.gallery_images)
        }

        // Fetch variants
        const variantsQuery = query(collection(db, "variants"), where("product_id", "==", productId))
        const variantsSnapshot = await getDocs(variantsQuery)

        const variantsPromises = variantsSnapshot.docs.map(async (variantDoc) => {
          const variantData = variantDoc.data()

          // Fetch attributes for this variant
          const attributesQuery = query(collection(db, "variant_attributes"), where("variant_id", "==", variantDoc.id))
          const attributesSnapshot = await getDocs(attributesQuery)

          const attributes = attributesSnapshot.docs.map((attrDoc) => ({
            id: attrDoc.id,
            key_name: attrDoc.data().key_name,
            value_name: attrDoc.data().value_name,
            key: attrDoc.data().key_name,
            value: attrDoc.data().value_name,
          }))

          return {
            id: variantDoc.id,
            name: variantData.name || "",
            price: variantData.price?.toString() || "",
            stock: variantData.stock?.toString() || "",
            attributes: attributes.length > 0 ? attributes : [{ key: "", value: "" }],
            image_url: variantData.image_url || "",
            imageFile: null,
            imagePreview: variantData.image_url || "",
            isImageChanged: false,
          }
        })

        const variantsData = await Promise.all(variantsPromises)
        setVariants(variantsData)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching product:", error)
        toast.error("Failed to load product")
        router.push("/products")
      }
    }

    fetchProduct()
  }, [productId, router])

  // Handle main image selection
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setMainImageFile(file)
      setMainImagePreview(URL.createObjectURL(file))
      setIsMainImageChanged(true)
    }
  }

  // Handle gallery images selection
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      const newFilesWithPreviews = newFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))

      setNewGalleryImages((prev) => [...prev, ...newFilesWithPreviews])
    }
  }

  // Remove gallery image
  const removeGalleryImage = (index: number) => {
    const currentGalleryImages = [...galleryPreviews]
    const imageToRemove = currentGalleryImages[index]

    // Add to deleted images if it's an existing image
    if (imageToRemove && !newGalleryImages.some((img) => img.preview === imageToRemove)) {
      setDeletedGalleryImages((prev) => [...prev, imageToRemove])
    }

    // Remove from previews
    const newPreviews = [...galleryPreviews]
    newPreviews.splice(index, 1)
    setGalleryPreviews(newPreviews)
  }

  // Remove new gallery image
  const removeNewGalleryImage = (index: number) => {
    const newImages = [...newGalleryImages]

    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newImages[index].preview)

    newImages.splice(index, 1)
    setNewGalleryImages(newImages)
  }

  // Handle variant image selection
  const handleVariantImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const newVariants = [...variants]

      // If there was a previous preview from a file (not from storage), revoke it
      if (newVariants[index].isImageChanged && newVariants[index].imagePreview) {
        URL.revokeObjectURL(newVariants[index].imagePreview)
      }

      newVariants[index] = {
        ...newVariants[index],
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
        isImageChanged: true,
      }
      setVariants(newVariants)
    }
  }

  // Remove variant image
  const removeVariantImage = (index: number) => {
    const newVariants = [...variants]

    // If there was a preview from a file (not from storage), revoke it
    if (newVariants[index].isImageChanged && newVariants[index].imagePreview) {
      URL.revokeObjectURL(newVariants[index].imagePreview)
    }

    newVariants[index] = {
      ...newVariants[index],
      imageFile: null,
      imagePreview: "",
      image_url: "",
      isImageChanged: true,
    }

    setVariants(newVariants)
  }

  // Add a new variant
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: `new-${Date.now()}`,
        name: "",
        price: "",
        stock: "",
        attributes: [{ key: "", value: "" }],
        imageFile: null,
        imagePreview: "",
        isImageChanged: false,
      },
    ])
  }

  // Remove a variant
  const removeVariant = (index: number) => {
    const variantToRemove = variants[index]

    // If it's an existing variant (has an ID that doesn't start with "new-"), add to deleted list
    if (variantToRemove.id && !variantToRemove.id.startsWith("new-")) {
      setDeletedVariantIds((prev) => [...prev, variantToRemove.id])

      // Add all attributes to deleted list
      variantToRemove.attributes.forEach((attr) => {
        if (attr.id) {
          // Use a type assertion to ensure TypeScript knows we're only adding strings
          setDeletedAttributeIds((prev) => [...prev, attr.id as string])
        }
      })
    }

    // If there was a preview from a file (not from storage), revoke it
    if (variantToRemove.isImageChanged && variantToRemove.imagePreview) {
      URL.revokeObjectURL(variantToRemove.imagePreview)
    }

    const newVariants = [...variants]
    newVariants.splice(index, 1)

    if (newVariants.length === 0) {
      // Add a default empty variant if all are removed
      setVariants([
        {
          id: `new-${Date.now()}`,
          name: "",
          price: "",
          stock: "",
          attributes: [{ key: "", value: "" }],
          imageFile: null,
          imagePreview: "",
          isImageChanged: false,
        },
      ])
    } else {
      setVariants(newVariants)
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
    const attrToRemove = newVariants[variantIndex].attributes[attrIndex]

    // If it's an existing attribute (has an ID), add to deleted list
    if (attrToRemove.id) {
      // Use a type assertion to ensure TypeScript knows we're only adding strings
      setDeletedAttributeIds((prev) => [...prev, attrToRemove.id as string])
    }

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
  const updateAttribute = (variantIndex: number, attrIndex: number, field: "key" | "value", value: string) => {
    const newVariants = [...variants]
    const newAttributes = [...newVariants[variantIndex].attributes]
    newAttributes[attrIndex] = {
      ...newAttributes[attrIndex],
      [field]: value,
      [field === "key" ? "key_name" : "value_name"]: value,
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
      if (!product.name || !product.sku || !product.base_price) {
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

      // Handle main image changes
      let mainImageUrl = product.main_image_url || ""
      if (isMainImageChanged && mainImageFile) {
        // Delete old image if exists
        if (product.main_image_url && product.main_image_url.startsWith("local-image://")) {
          const imageId = getImageIdFromUrl(product.main_image_url)
          if (imageId) {
            await deleteImage(imageId)
          }
        }

        // Save new image
        const imageId = generateImageId("product_main")
        mainImageUrl = await saveImage(imageId, mainImageFile)
      } else if (isMainImageChanged && !mainImageFile) {
        // Image was removed
        if (product.main_image_url && product.main_image_url.startsWith("local-image://")) {
          const imageId = getImageIdFromUrl(product.main_image_url)
          if (imageId) {
            await deleteImage(imageId)
          }
        }
        mainImageUrl = ""
      }

      // Handle gallery image changes
      let galleryUrls = [...galleryPreviews]

      // Remove deleted gallery images
      for (const imageUrl of deletedGalleryImages) {
        if (imageUrl.startsWith("local-image://")) {
          const imageId = getImageIdFromUrl(imageUrl)
          if (imageId) {
            await deleteImage(imageId)
          }
        }
        galleryUrls = galleryUrls.filter((url) => url !== imageUrl)
      }

      // Add new gallery images
      for (const { file } of newGalleryImages) {
        const imageId = generateImageId("product_gallery")
        const url = await saveImage(imageId, file)
        galleryUrls.push(url)
      }

      // Update product in Firestore
      await updateDoc(doc(db, "products", productId), {
        name: product.name,
        sku: product.sku,
        base_price: Number.parseFloat(product.base_price),
        description: product.description,
        status: product.status,
        category: product.category,
        subcategory: product.subcategory,
        main_image_url: mainImageUrl,
        gallery_images: galleryUrls,
        updated_at: new Date(),
      })

      // Delete removed variants
      for (const variantId of deletedVariantIds) {
        await deleteDoc(doc(db, "variants", variantId))
      }

      // Delete removed attributes
      for (const attrId of deletedAttributeIds) {
        await deleteDoc(doc(db, "variant_attributes", attrId))
      }

      // Update or add variants
      for (const variant of variants) {
        let variantRef

        // Handle variant image
        let variantImageUrl = variant.image_url || ""
        if (variant.isImageChanged) {
          // Delete old image if exists
          if (variant.image_url && variant.image_url.startsWith("local-image://")) {
            const imageId = getImageIdFromUrl(variant.image_url)
            if (imageId) {
              await deleteImage(imageId)
            }
          }

          // Save new image if exists
          if (variant.imageFile) {
            const imageId = generateImageId("variant")
            variantImageUrl = await saveImage(imageId, variant.imageFile)
          } else {
            variantImageUrl = ""
          }
        }

        if (variant.id.startsWith("new-")) {
          // Add new variant
          variantRef = await addDoc(collection(db, "variants"), {
            product_id: productId,
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
            image_url: variantImageUrl,
          })
        } else {
          // Update existing variant
          variantRef = doc(db, "variants", variant.id)
          await updateDoc(variantRef, {
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
            image_url: variantImageUrl,
          })
        }

        // Handle attributes
        for (const attr of variant.attributes) {
          if (attr.id) {
            // Update existing attribute if not in deleted list
            if (!deletedAttributeIds.includes(attr.id)) {
              await updateDoc(doc(db, "variant_attributes", attr.id), {
                key_name: attr.key,
                value_name: attr.value,
              })
            }
          } else {
            // Add new attribute
            await addDoc(collection(db, "variant_attributes"), {
              variant_id: variantRef.id,
              key_name: attr.key,
              value_name: attr.value,
            })
          }
        }
      }

      // Clean up object URLs
      if (mainImageFile && mainImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(mainImagePreview)
      }

      newGalleryImages.forEach(({ preview }) => URL.revokeObjectURL(preview))

      variants.forEach((variant) => {
        if (variant.isImageChanged && variant.imagePreview.startsWith("blob:")) {
          URL.revokeObjectURL(variant.imagePreview)
        }
      })

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
          <p>Loading product...</p>
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
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
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
                  value={product.sku}
                  onChange={(e) => setProduct({ ...product, sku: e.target.value })}
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
                  value={product.base_price}
                  onChange={(e) => setProduct({ ...product, base_price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="status"
                    checked={product.status === "active"}
                    onCheckedChange={(checked) => setProduct({ ...product, status: checked ? "active" : "inactive" })}
                  />
                  <span>{product.status === "active" ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={product.category} onValueChange={(value) => setProduct({ ...product, category: value })}>
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
                <Select
                  value={product.subcategory}
                  onValueChange={(value) => setProduct({ ...product, subcategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.category === "electronics" && (
                      <>
                        <SelectItem value="phones">Phones</SelectItem>
                        <SelectItem value="computers">Computers</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                      </>
                    )}
                    {product.category === "clothing" && (
                      <>
                        <SelectItem value="shirts">Shirts</SelectItem>
                        <SelectItem value="pants">Pants</SelectItem>
                        <SelectItem value="shoes">Shoes</SelectItem>
                      </>
                    )}
                    {product.category === "food" && (
                      <>
                        <SelectItem value="beverages">Beverages</SelectItem>
                        <SelectItem value="snacks">Snacks</SelectItem>
                        <SelectItem value="meals">Meals</SelectItem>
                      </>
                    )}
                    {product.category === "furniture" && (
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

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Product Image */}
            <div className="space-y-2">
              <Label>Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 w-40 h-40 flex flex-col items-center justify-center relative">
                  {mainImagePreview ? (
                    <>
                      <div className="relative w-full h-full">
                        {mainImagePreview.startsWith("blob:") ? (
                          <Image
                            src={mainImagePreview || "/placeholder.svg"}
                            alt="Main product image"
                            fill
                            className="object-cover rounded-md"
                          />
                        ) : (
                          <LocalImage
                            src={mainImagePreview}
                            alt="Main product image"
                            fill
                            className="object-cover rounded-md"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full"
                        onClick={() => {
                          if (mainImagePreview.startsWith("blob:")) {
                            URL.revokeObjectURL(mainImagePreview)
                          }
                          setMainImageFile(null)
                          setMainImagePreview("")
                          setIsMainImageChanged(true)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500 text-center">Click to upload main image</span>
                      <input
                        ref={mainImageInputRef}
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleMainImageChange}
                      />
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">
                    This will be the primary image shown in product listings and at the top of the product detail page.
                  </p>
                </div>
              </div>
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <Label>Gallery Images</Label>
              <div className="flex flex-wrap gap-4">
                {/* Existing gallery images */}
                {galleryPreviews.map((preview, index) => (
                  <div key={`existing-${index}`} className="relative w-24 h-24 border rounded-md overflow-hidden">
                    <LocalImage src={preview} alt={`Gallery image ${index + 1}`} fill className="object-cover" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full"
                      onClick={() => removeGalleryImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* New gallery images */}
                {newGalleryImages.map((image, index) => (
                  <div key={`new-${index}`} className="relative w-24 h-24 border rounded-md overflow-hidden">
                    <Image
                      src={image.preview || "/placeholder.svg"}
                      alt={`New gallery image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full"
                      onClick={() => removeNewGalleryImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Add gallery image button */}
                <div
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Add</span>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryImagesChange}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Add up to 5 additional images to show your product from different angles.
              </p>
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
                  <Button
                    type="button"
                    onClick={() => removeVariant(variantIndex)}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

                {/* Variant Image */}
                <div className="space-y-2">
                  <Label>Variant Image</Label>
                  <div className="flex items-start gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 w-24 h-24 flex flex-col items-center justify-center relative">
                      {variant.imagePreview ? (
                        <>
                          <div className="relative w-full h-full">
                            {variant.isImageChanged ? (
                              <Image
                                src={variant.imagePreview || "/placeholder.svg"}
                                alt={`Variant ${variantIndex + 1} image`}
                                fill
                                className="object-cover rounded-md"
                              />
                            ) : (
                              <LocalImage
                                src={variant.imagePreview}
                                alt={`Variant ${variantIndex + 1} image`}
                                fill
                                className="object-cover rounded-md"
                              />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5 bg-white rounded-full"
                            onClick={() => removeVariantImage(variantIndex)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 text-center">Upload</span>
                          <input
                            ref={setVariantImageRef(variantIndex)}
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleVariantImageChange(variantIndex, e)}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Add a specific image for this variant (optional).</p>
                    </div>
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}

