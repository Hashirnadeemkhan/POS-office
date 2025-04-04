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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc,
  orderBy,
  onSnapshot,
} from "firebase/firestore"
import { posDb } from "@/firebase/client"
import { saveImage, generateImageId, deleteImage, getImageIdFromUrl } from "@/lib/imageStorage"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"

interface VariantAttribute {
  id?: string
  key: string
  value: string
}

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
  quantity: string
  description: string
  status: "active" | "inactive"
  category: string
  subcategory: string
  main_image_url?: string
  gallery_images?: string[]
  attributes: VariantAttribute[]
  restaurantId?: string
}

interface Category {
  id: string
  name: string
  restaurantId?: string
}

interface Subcategory {
  id: string
  name: string
  categoryId: string
  restaurantId?: string
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user } = useAuth()
  const restaurantId = user?.uid
  const productId = params.id

  const [product, setProduct] = useState<Product>({
    id: productId,
    name: "",
    sku: "",
    base_price: "",
    quantity: "",
    description: "",
    status: "active",
    category: "",
    subcategory: "",
    main_image_url: "",
    gallery_images: [],
    attributes: [{ key: "", value: "" }],
  })

  const [variants, setVariants] = useState<Variant[]>([])
  const [basicAttributes, setBasicAttributes] = useState<VariantAttribute[]>([{ key: "", value: "" }])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
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

  const setVariantImageRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      variantImageRefs.current[index] = el
    },
    [],
  )

  // Fetch categories and subcategories
  useEffect(() => {
    if (!restaurantId) return

    const qCategories = query(
      collection(posDb, "categories"),
      where("restaurantId", "==", restaurantId),
      orderBy("name"),
    )
    const unsubscribeCategories = onSnapshot(
      qCategories,
      (snapshot) => {
        const cats = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          restaurantId: doc.data().restaurantId,
        }))
        setCategories(cats)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast.error("Failed to load categories")
      },
    )

    return () => unsubscribeCategories()
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId || !product.category) {
      setSubcategories([])
      return
    }

    const selectedCategory = categories.find((cat) => cat.name === product.category)
    if (selectedCategory) {
      const qSubcategories = query(
        collection(posDb, "subcategories"),
        where("categoryId", "==", selectedCategory.id),
        where("restaurantId", "==", restaurantId),
        orderBy("name"),
      )
      const unsubscribeSubcategories = onSnapshot(
        qSubcategories,
        (snapshot) => {
          const subcats = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            categoryId: doc.data().categoryId,
            restaurantId: doc.data().restaurantId,
          }))
          setSubcategories(subcats)
        },
        (error) => {
          console.error("Error fetching subcategories:", error)
          toast.error("Failed to load subcategories")
        },
      )
      return () => unsubscribeSubcategories()
    }
  }, [product.category, categories, restaurantId])

  // Fetch product data
  useEffect(() => {
    if (!restaurantId) return

    const fetchProduct = async () => {
      try {
        setIsLoading(true)

        const productDoc = await getDoc(doc(posDb, "products", productId))
        if (!productDoc.exists()) {
          toast.error("Product not found")
          router.push("/pos/products")
          return
        }

        const productData = productDoc.data()
        const fetchedAttributes = productData.attributes || [{ key: "", value: "" }]
        setProduct({
          id: productId,
          name: productData.name || "",
          sku: productData.sku || "",
          base_price: productData.base_price?.toString() || "",
          quantity: productData.quantity?.toString() || "",
          description: productData.description || "",
          status: productData.status || "active",
          category: productData.category || "",
          subcategory: productData.subcategory || "",
          main_image_url: productData.main_image_url || "",
          gallery_images: productData.gallery_images || [],
          attributes: fetchedAttributes,
          restaurantId: productData.restaurantId,
        })
        setBasicAttributes(fetchedAttributes)

        if (productData.main_image_url) {
          setMainImagePreview(productData.main_image_url)
        }

        if (productData.gallery_images && productData.gallery_images.length > 0) {
          setGalleryPreviews(productData.gallery_images)
        }

        const variantsQuery = query(
          collection(posDb, "variants"),
          where("product_id", "==", productId),
          where("productRestaurantId", "==", restaurantId),
        )
        const variantsSnapshot = await getDocs(variantsQuery)

        const variantsPromises = variantsSnapshot.docs.map(async (variantDoc) => {
          const variantData = variantDoc.data()

          const attributesQuery = query(
            collection(posDb, "variant_attributes"),
            where("variant_id", "==", variantDoc.id),
            where("variantRestaurantId", "==", restaurantId),
          )
          const attributesSnapshot = await getDocs(attributesQuery)

          const attributes = attributesSnapshot.docs.map((attrDoc) => ({
            id: attrDoc.id,
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
        router.push("/pos/products")
      }
    }

    fetchProduct()
  }, [productId, router, restaurantId])

  // Handle main image change
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setMainImageFile(file)
      setMainImagePreview(URL.createObjectURL(file))
      setIsMainImageChanged(true)
    }
  }

  // Handle gallery images change
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

    if (imageToRemove && !newGalleryImages.some((img) => img.preview === imageToRemove)) {
      setDeletedGalleryImages((prev) => [...prev, imageToRemove])
    }

    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  // Remove new gallery image
  const removeNewGalleryImage = (index: number) => {
    const newImages = [...newGalleryImages]
    URL.revokeObjectURL(newImages[index].preview)
    newImages.splice(index, 1)
    setNewGalleryImages(newImages)
  }

  // Handle variant image change
  const handleVariantImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const newVariants = [...variants]

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
    if (variantToRemove.id && !variantToRemove.id.startsWith("new-")) {
      setDeletedVariantIds((prev) => [...prev, variantToRemove.id])
      const attrIds = variantToRemove.attributes.filter((attr) => attr.id).map((attr) => attr.id!)
      setDeletedAttributeIds((prev) => [...prev, ...attrIds])
    }

    if (variantToRemove.isImageChanged && variantToRemove.imagePreview) {
      URL.revokeObjectURL(variantToRemove.imagePreview)
    }

    const newVariants = [...variants]
    newVariants.splice(index, 1)
    setVariants(newVariants)
  }

  // Update variant field
  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
  }

  // Add attribute to variant
  const addAttribute = (variantIndex: number) => {
    const newVariants = [...variants]
    newVariants[variantIndex].attributes.push({ key: "", value: "" })
    setVariants(newVariants)
  }

  // Remove attribute from variant
  const removeAttribute = (variantIndex: number, attrIndex: number) => {
    const newVariants = [...variants]
    const attrToRemove = newVariants[variantIndex].attributes[attrIndex]
    if (attrToRemove.id) {
      setDeletedAttributeIds((prev) => [...prev, attrToRemove.id!])
    }
    if (newVariants[variantIndex].attributes.length > 1) {
      newVariants[variantIndex].attributes.splice(attrIndex, 1)
      setVariants(newVariants)
    }
  }

  // Update attribute
  const updateAttribute = (variantIndex: number, attrIndex: number, field: "key" | "value", value: string) => {
    const newVariants = [...variants]
    newVariants[variantIndex].attributes[attrIndex][field] = value
    setVariants(newVariants)
  }

  // Basic attributes handling
  const addBasicAttribute = () => {
    setBasicAttributes([...basicAttributes, { key: "", value: "" }])
  }

  const removeBasicAttribute = (index: number) => {
    if (basicAttributes.length > 1) {
      const newAttributes = [...basicAttributes]
      newAttributes.splice(index, 1)
      setBasicAttributes(newAttributes)
    }
  }

  const updateBasicAttribute = (index: number, field: "key" | "value", value: string) => {
    const newAttributes = [...basicAttributes]
    newAttributes[index][field] = value
    setBasicAttributes(newAttributes)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!product.name || !product.sku || !product.base_price || !product.quantity) {
        toast.error("Please fill in all required fields")
        setIsSubmitting(false)
        return
      }

      for (const attr of basicAttributes) {
        if (!attr.key || !attr.value) {
          toast.error("Please fill in all attribute fields")
          setIsSubmitting(false)
          return
        }
      }

      for (const variant of variants) {
        if (!variant.name || !variant.price || !variant.stock) {
          toast.error("Please fill in all variant fields")
          setIsSubmitting(false)
          return
        }
        for (const attr of variant.attributes) {
          if (!attr.key || !attr.value) {
            toast.error("Please fill in all variant attribute fields")
            setIsSubmitting(false)
            return
          }
        }
      }

      let mainImageUrl = product.main_image_url || ""
      if (isMainImageChanged) {
        if (mainImageFile) {
          if (product.main_image_url) {
            const imageId = getImageIdFromUrl(product.main_image_url)
            if (imageId) await deleteImage(imageId)
          }
          const imageId = generateImageId("product_main")
          mainImageUrl = await saveImage(imageId, mainImageFile)
        } else if (product.main_image_url) {
          const imageId = getImageIdFromUrl(product.main_image_url)
          if (imageId) await deleteImage(imageId)
          mainImageUrl = ""
        }
      }

      let galleryUrls = [...galleryPreviews]
      for (const imageUrl of deletedGalleryImages) {
        const imageId = getImageIdFromUrl(imageUrl)
        if (imageId) await deleteImage(imageId)
        galleryUrls = galleryUrls.filter((url) => url !== imageUrl)
      }
      for (const { file } of newGalleryImages) {
        const imageId = generateImageId("product_gallery")
        const url = await saveImage(imageId, file)
        galleryUrls.push(url)
      }

      await updateDoc(doc(posDb, "products", productId), {
        name: product.name,
        sku: product.sku,
        base_price: Number.parseFloat(product.base_price),
        quantity: Number.parseInt(product.quantity),
        description: product.description,
        status: product.status,
        category: product.category,
        subcategory: product.subcategory,
        main_image_url: mainImageUrl,
        gallery_images: galleryUrls,
        attributes: basicAttributes,
        restaurantId,
        updated_at: new Date(),
      })

      for (const variantId of deletedVariantIds) {
        await deleteDoc(doc(posDb, "variants", variantId))
      }

      for (const attrId of deletedAttributeIds) {
        await deleteDoc(doc(posDb, "variant_attributes", attrId))
      }

      for (const variant of variants) {
        let variantImageUrl = variant.image_url || ""
        if (variant.isImageChanged) {
          if (variant.image_url) {
            const imageId = getImageIdFromUrl(variant.image_url)
            if (imageId) await deleteImage(imageId)
          }
          if (variant.imageFile) {
            const imageId = generateImageId("variant")
            variantImageUrl = await saveImage(imageId, variant.imageFile)
          } else {
            variantImageUrl = ""
          }
        }

        let variantRef
        if (variant.id.startsWith("new-")) {
          variantRef = await addDoc(collection(posDb, "variants"), {
            product_id: productId,
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
            image_url: variantImageUrl,
            productRestaurantId: restaurantId,
          })
        } else {
          variantRef = doc(posDb, "variants", variant.id)
          await updateDoc(variantRef, {
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
            image_url: variantImageUrl,
          })
        }

        for (const attr of variant.attributes) {
          if (attr.id && !deletedAttributeIds.includes(attr.id)) {
            await updateDoc(doc(posDb, "variant_attributes", attr.id), {
              key_name: attr.key,
              value_name: attr.value,
              variantRestaurantId: restaurantId,
            })
          } else if (!attr.id) {
            await addDoc(collection(posDb, "variant_attributes"), {
              variant_id: variantRef.id,
              key_name: attr.key,
              value_name: attr.value,
              variantRestaurantId: restaurantId,
            })
          }
        }
      }

      if (mainImageFile && mainImagePreview.startsWith("blob:")) URL.revokeObjectURL(mainImagePreview)
      newGalleryImages.forEach(({ preview }) => URL.revokeObjectURL(preview))
      variants.forEach((variant) => {
        if (variant.isImageChanged && variant.imagePreview.startsWith("blob:")) {
          URL.revokeObjectURL(variant.imagePreview)
        }
      })

      toast.success("Product updated successfully")
      router.push("/pos/products")
    } catch (error: any) {
      console.error("Error updating product:", error)
      toast.error(`Failed to update product: ${error.message}`)
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

  if (!restaurantId) {
    return <div>Please log in to edit products.</div>
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
                <Label htmlFor="quantity">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={product.quantity}
                  onChange={(e) => setProduct({ ...product, quantity: e.target.value })}
                  placeholder="0"
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
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={product.subcategory}
                  onValueChange={(value) => setProduct({ ...product, subcategory: value })}
                  disabled={!product.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.length > 0 ? (
                      subcategories.map((subcat) => (
                        <SelectItem key={subcat.id} value={subcat.name}>
                          {subcat.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-subcategories" disabled>
                        No subcategories available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <Label>Attributes</Label>
                <Button type="button" onClick={addBasicAttribute} variant="outline" size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Attribute
                </Button>
              </div>
              {basicAttributes.map((attr, attrIndex) => (
                <div key={attrIndex} className="flex items-center gap-2">
                  <Input
                    value={attr.key}
                    onChange={(e) => updateBasicAttribute(attrIndex, "key", e.target.value)}
                    placeholder="Attribute (e.g. Size)"
                    className="flex-1"
                  />
                  <Input
                    value={attr.value}
                    onChange={(e) => updateBasicAttribute(attrIndex, "value", e.target.value)}
                    placeholder="Value (e.g. Large)"
                    className="flex-1"
                  />
                  {basicAttributes.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeBasicAttribute(attrIndex)}
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Main Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 w-40 h-40 flex flex-col items-center justify-center relative">
                  {mainImagePreview ? (
                    <>
                      <div className="relative w-full h-full">
                        <Image
                          src={mainImagePreview || "/placeholder.svg"}
                          alt="Main product image"
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full"
                        onClick={() => {
                          if (mainImagePreview.startsWith("blob:")) URL.revokeObjectURL(mainImagePreview)
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
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gallery Images</Label>
              <div className="flex flex-wrap gap-4">
                {galleryPreviews.map((preview, index) => (
                  <div key={`existing-${index}`} className="relative w-24 h-24 border rounded-md overflow-hidden">
                    <Image
                      src={preview || "/placeholder.svg"}
                      alt={`Gallery image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Product Variants (Optional)</CardTitle>
            <Button type="button" onClick={addVariant} variant="outline" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {variants.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground"></div>
            ) : (
              variants.map((variant, variantIndex) => (
                <div key={variantIndex} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Variant {variantIndex + 1}</h3>
                    <Button
                      type="button"
                      onClick={() => removeVariant(variantIndex)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
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
                        placeholder="e.g. Small, Red"
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
                    <Label>Variant Image</Label>
                    <div className="flex items-start gap-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 w-24 h-24 flex flex-col items-center justify-center relative">
                        {variant.imagePreview ? (
                          <>
                            <div className="relative w-full h-full">
                              <Image
                                src={variant.imagePreview || "/placeholder.svg"}
                                alt={`Variant ${variantIndex + 1} image`}
                                fill
                                className="object-cover rounded-md"
                              />
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
                            <span className="text-xs text-gray-500">Upload</span>
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Variant-Specific Attributes</Label>
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
                          placeholder="Attribute (e.g. Size)"
                          className="flex-1"
                        />
                        <Input
                          value={attr.value}
                          onChange={(e) => updateAttribute(variantIndex, attrIndex, "value", e.target.value)}
                          placeholder="Value (e.g. Large)"
                          className="flex-1"
                        />
                        {variant.attributes.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeAttribute(variantIndex, attrIndex)}
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
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

