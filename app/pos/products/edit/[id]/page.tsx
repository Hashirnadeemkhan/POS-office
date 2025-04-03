"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, ArrowLeft, Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { posDb } from "@/firebase/client";
import { saveImage, generateImageId, deleteImage, getImageIdFromUrl } from "@/lib/imageStorage";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface VariantAttribute {
  id?: string; // Added for existing attributes
  key: string;
  value: string;
}

interface Variant {
  id?: string; // Added for existing variants
  name: string;
  price: string;
  stock: string;
  attributes: VariantAttribute[];
  imageFile: File | null;
  imagePreview: string;
  image_url?: string; // For existing images
}

interface Category {
  id: string;
  name: string;
  restaurantId?: string;
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  restaurantId?: string;
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const restaurantId = user?.uid;
  const productId = params.id;

  // Base product information
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Variants
  const [variants, setVariants] = useState<Variant[]>([]);

  // Basic attributes
  const [basicAttributes, setBasicAttributes] = useState<VariantAttribute[]>([{ key: "", value: "" }]);

  // Categories and Subcategories
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");

  // Product images
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  // Refs for file inputs
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const variantImageRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Loading and submitting states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track deletions
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [deletedAttributeIds, setDeletedAttributeIds] = useState<string[]>([]);
  const [deletedGalleryImages, setDeletedGalleryImages] = useState<string[]>([]);

  // Fetch categories
  useEffect(() => {
    if (!restaurantId) return;

    const fetchCategories = async () => {
      const q = query(
        collection(posDb, "categories"),
        where("restaurantId", "==", restaurantId),
        orderBy("name"),
      );
      const snapshot = await getDocs(q);
      const cats = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        restaurantId: doc.data().restaurantId,
      }));
      setCategories(cats);
    };

    fetchCategories().catch((error) => {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    });
  }, [restaurantId]);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!restaurantId || !category) {
      setSubcategories([]);
      return;
    }

    const selectedCategory = categories.find((cat) => cat.name === category);
    if (selectedCategory) {
      const fetchSubcategories = async () => {
        const q = query(
          collection(posDb, "subcategories"),
          where("categoryId", "==", selectedCategory.id),
          where("restaurantId", "==", restaurantId),
          orderBy("name"),
        );
        const snapshot = await getDocs(q);
        const subcats = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          categoryId: doc.data().categoryId,
          restaurantId: doc.data().restaurantId,
        }));
        setSubcategories(subcats);
      };

      fetchSubcategories().catch((error) => {
        console.error("Error fetching subcategories:", error);
        toast.error("Failed to load subcategories");
      });
    }
  }, [category, categories, restaurantId]);

  // Fetch product data
  useEffect(() => {
    if (!restaurantId || !productId) return;

    const fetchProduct = async () => {
      try {
        setIsLoading(true);

        // Fetch product
        const productDoc = await getDoc(doc(posDb, "products", productId));
        if (!productDoc.exists()) {
          toast.error("Product not found");
          router.push("/pos/products");
          return;
        }

        const productData = productDoc.data();
        setName(productData.name || "");
        setSku(productData.sku || "");
        setBasePrice(productData.base_price?.toString() || "");
        setDescription(productData.description || "");
        setStatus(productData.status || "active");
        setCategory(productData.category || "");
        setSubcategory(productData.subcategory || "");
        setBasicAttributes(productData.attributes || [{ key: "", value: "" }]);
        setMainImagePreview(productData.main_image_url || "");
        setGalleryPreviews(productData.gallery_images || []);

        // Fetch variants
        const variantsQuery = query(
          collection(posDb, "variants"),
          where("product_id", "==", productId),
          where("productRestaurantId", "==", restaurantId),
        );
        const variantsSnapshot = await getDocs(variantsQuery);

        const variantsData = await Promise.all(
          variantsSnapshot.docs.map(async (variantDoc) => {
            const variantData = variantDoc.data();

            // Fetch variant attributes
            const attributesQuery = query(
              collection(posDb, "variant_attributes"),
              where("variant_id", "==", variantDoc.id),
              where("variantRestaurantId", "==", restaurantId),
            );
            const attributesSnapshot = await getDocs(attributesQuery);
            const attributes = attributesSnapshot.docs.map((attrDoc) => ({
              id: attrDoc.id,
              key: attrDoc.data().key_name,
              value: attrDoc.data().value_name,
            }));

            return {
              id: variantDoc.id,
              name: variantData.name || "",
              price: variantData.price?.toString() || "",
              stock: variantData.stock?.toString() || "",
              attributes: attributes.length > 0 ? attributes : [{ key: "", value: "" }],
              imageFile: null,
              imagePreview: variantData.image_url || "",
              image_url: variantData.image_url || "",
            };
          }),
        );

        setVariants(variantsData);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, restaurantId, router]);

  // Handle main image change
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMainImageFile(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle gallery images change
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setGalleryFiles((prev) => [...prev, ...newFiles]);
      setGalleryPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // Handle variant image change
  const handleVariantImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newVariants = [...variants];
      if (newVariants[index].imagePreview && newVariants[index].imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(newVariants[index].imagePreview);
      }
      newVariants[index] = {
        ...newVariants[index],
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      };
      setVariants(newVariants);
    }
  };

  // Remove gallery image
  const removeGalleryImage = (index: number) => {
    const newFiles = [...galleryFiles];
    const newPreviews = [...galleryPreviews];
    const removedUrl = newPreviews[index];

    if (removedUrl && !removedUrl.startsWith("blob:")) {
      setDeletedGalleryImages((prev) => [...prev, removedUrl]);
    } else if (removedUrl) {
      URL.revokeObjectURL(removedUrl);
    }

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setGalleryFiles(newFiles);
    setGalleryPreviews(newPreviews);
  };

  // Remove variant image
  const removeVariantImage = (index: number) => {
    const newVariants = [...variants];
    if (newVariants[index].imagePreview && newVariants[index].imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(newVariants[index].imagePreview);
    }
    newVariants[index] = {
      ...newVariants[index],
      imageFile: null,
      imagePreview: "",
    };
    setVariants(newVariants);
  };

  // Add a new variant
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: "",
        price: "",
        stock: "",
        attributes: [{ key: "", value: "" }],
        imageFile: null,
        imagePreview: "",
      },
    ]);
  };

  // Remove a variant
  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    const variantToRemove = newVariants[index];

    if (variantToRemove.id) {
      setDeletedVariantIds((prev) => [...prev, variantToRemove.id]);
      const attrIds = variantToRemove.attributes
        .filter((attr) => attr.id)
        .map((attr) => attr.id as string);
      setDeletedAttributeIds((prev) => [...prev, ...attrIds]);
    }

    if (variantToRemove.imagePreview && variantToRemove.imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(variantToRemove.imagePreview);
    }

    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  // Update variant field
  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const newVariants = [...variants];
    newVariants[index] = {
      ...newVariants[index],
      [field]: value,
    };
    setVariants(newVariants);
  };

  // Add attribute to variant
  const addAttribute = (variantIndex: number) => {
    const newVariants = [...variants];
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      attributes: [...newVariants[variantIndex].attributes, { key: "", value: "" }],
    };
    setVariants(newVariants);
  };

  // Remove attribute from variant
  const removeAttribute = (variantIndex: number, attrIndex: number) => {
    const newVariants = [...variants];
    const attrToRemove = newVariants[variantIndex].attributes[attrIndex];

    if (attrToRemove.id) {
      setDeletedAttributeIds((prev) => [...prev, attrToRemove.id]);
    }

    if (newVariants[variantIndex].attributes.length > 1) {
      const newAttributes = [...newVariants[variantIndex].attributes];
      newAttributes.splice(attrIndex, 1);
      newVariants[variantIndex] = {
        ...newVariants[variantIndex],
        attributes: newAttributes,
      };
      setVariants(newVariants);
    }
  };

  // Update attribute
  const updateAttribute = (
    variantIndex: number,
    attrIndex: number,
    field: keyof VariantAttribute,
    value: string,
  ) => {
    const newVariants = [...variants];
    const newAttributes = [...newVariants[variantIndex].attributes];
    newAttributes[attrIndex] = {
      ...newAttributes[attrIndex],
      [field]: value,
    };
    newVariants[variantIndex] = {
      ...newVariants[variantIndex],
      attributes: newAttributes,
    };
    setVariants(newVariants);
  };

  // Helper to set variant image ref
  const setVariantImageRef = (index: number) => (el: HTMLInputElement | null) => {
    variantImageRefs.current[index] = el;
  };

  // Basic attributes handlers
  const addBasicAttribute = () => {
    setBasicAttributes([...basicAttributes, { key: "", value: "" }]);
  };

  const removeBasicAttribute = (index: number) => {
    if (basicAttributes.length > 1) {
      const newAttributes = [...basicAttributes];
      newAttributes.splice(index, 1);
      setBasicAttributes(newAttributes);
    }
  };

  const updateBasicAttribute = (index: number, field: keyof VariantAttribute, value: string) => {
    const newAttributes = [...basicAttributes];
    newAttributes[index] = {
      ...newAttributes[index],
      [field]: value,
    };
    setBasicAttributes(newAttributes);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!restaurantId) {
      toast.error("No restaurant ID found. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (!name || !sku || !basePrice) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      for (const attr of basicAttributes) {
        if (!attr.key || !attr.value) {
          toast.error("Please fill in all attribute fields");
          setIsSubmitting(false);
          return;
        }
      }

      if (variants.length > 0) {
        for (const variant of variants) {
          if (!variant.name || !variant.price || !variant.stock) {
            toast.error("Please fill in all variant fields");
            setIsSubmitting(false);
            return;
          }
          for (const attr of variant.attributes) {
            if (!attr.key || !attr.value) {
              toast.error("Please fill in all attribute fields");
              setIsSubmitting(false);
              return;
            }
          }
        }
      }

      // Handle main image
      let mainImageUrl = mainImagePreview;
      if (mainImageFile) {
        if (mainImagePreview && !mainImagePreview.startsWith("blob:")) {
          const oldImageId = getImageIdFromUrl(mainImagePreview);
          if (oldImageId) await deleteImage(oldImageId);
        }
        const imageId = generateImageId("product_main");
        mainImageUrl = await saveImage(imageId, mainImageFile);
      } else if (!mainImagePreview && mainImagePreview !== "") {
        const oldImageId = getImageIdFromUrl(mainImagePreview);
        if (oldImageId) await deleteImage(oldImageId);
        mainImageUrl = "";
      }

      // Handle gallery images
      let galleryUrls = [...galleryPreviews];
      for (const url of deletedGalleryImages) {
        const imageId = getImageIdFromUrl(url);
        if (imageId) await deleteImage(imageId);
        galleryUrls = galleryUrls.filter((u) => u !== url);
      }
      for (const file of galleryFiles) {
        if (!galleryUrls.some((url) => url === URL.createObjectURL(file))) {
          const imageId = generateImageId("product_gallery");
          const url = await saveImage(imageId, file);
          galleryUrls.push(url);
        }
      }

      // Update product
      await updateDoc(doc(posDb, "products", productId), {
        name,
        sku,
        base_price: Number.parseFloat(basePrice),
        description,
        status,
        category,
        subcategory,
        main_image_url: mainImageUrl,
        gallery_images: galleryUrls,
        attributes: basicAttributes,
        restaurantId,
        updated_at: new Date(),
      });

      // Delete removed variants and attributes
      for (const variantId of deletedVariantIds) {
        await deleteDoc(doc(posDb, "variants", variantId));
      }
      for (const attrId of deletedAttributeIds) {
        await deleteDoc(doc(posDb, "variant_attributes", attrId));
      }

      // Update or add variants
      for (const variant of variants) {
        let variantImageUrl = variant.image_url || "";
        if (variant.imageFile) {
          if (variant.image_url) {
            const oldImageId = getImageIdFromUrl(variant.image_url);
            if (oldImageId) await deleteImage(oldImageId);
          }
          const imageId = generateImageId("variant");
          variantImageUrl = await saveImage(imageId, variant.imageFile);
        } else if (!variant.imagePreview && variant.image_url) {
          const oldImageId = getImageIdFromUrl(variant.image_url);
          if (oldImageId) await deleteImage(oldImageId);
          variantImageUrl = "";
        }

        let variantRef;
        if (variant.id) {
          variantRef = doc(posDb, "variants", variant.id);
          await updateDoc(variantRef, {
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
            image_url: variantImageUrl,
            productRestaurantId: restaurantId,
          });
        } else {
          variantRef = await addDoc(collection(posDb, "variants"), {
            product_id: productId,
            name: variant.name,
            price: Number.parseFloat(variant.price),
            stock: Number.parseInt(variant.stock),
            image_url: variantImageUrl,
            productRestaurantId: restaurantId,
          });
        }

        for (const attr of variant.attributes) {
          if (attr.id) {
            await updateDoc(doc(posDb, "variant_attributes", attr.id), {
              key_name: attr.key,
              value_name: attr.value,
              variantRestaurantId: restaurantId,
            });
          } else {
            await addDoc(collection(posDb, "variant_attributes"), {
              variant_id: variantRef.id,
              key_name: attr.key,
              value_name: attr.value,
              variantRestaurantId: restaurantId,
            });
          }
        }
      }

      // Cleanup
      if (mainImagePreview && mainImagePreview.startsWith("blob:")) URL.revokeObjectURL(mainImagePreview);
      galleryPreviews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      variants.forEach((variant) => {
        if (variant.imagePreview && variant.imagePreview.startsWith("blob:")) URL.revokeObjectURL(variant.imagePreview);
      });

      toast.success("Product updated successfully");
      router.push("/pos/products");
    } catch (error: any) {
      console.error("Error updating product:", error.message, error.code);
      toast.error(`Failed to update product: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return <div>Please log in to edit a product.</div>;
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
                <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
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
                          if (mainImagePreview && mainImagePreview.startsWith("blob:")) {
                            URL.revokeObjectURL(mainImagePreview);
                          }
                          setMainImageFile(null);
                          setMainImagePreview("");
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
                  <div key={index} className="relative w-24 h-24 border rounded-md overflow-hidden">
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
  );
}