// "use client"

// import { useState, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { CategorySubcategoryDropdown } from "./CategorySubCategoryDropdown"
// import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
// import { db } from "@/lib/firebase"

// export function ProductForm() {
//   const [categories, setCategories] = useState([])
//   const [selectedCategory, setSelectedCategory] = useState(null)
//   const [selectedSubcategory, setSelectedSubcategory] = useState(null)

//   useEffect(() => {
//     const fetchCategories = async () => {
//       const categoriesRef = collection(db, "categories")
//       const q = query(categoriesRef, orderBy("name"))
//       const snapshot = await getDocs(q)
//       const categoriesData = await Promise.all(
//         snapshot.docs.map(async (doc) => {
//           const category = { id: doc.id, ...doc.data() }
//           const subcategoriesRef = collection(db, "subcategories")
//           const subcategoriesQuery = query(subcategoriesRef, where("categoryId", "==", category.id))
//           const subcategoriesSnapshot = await getDocs(subcategoriesQuery)
//           category.subcategories = subcategoriesSnapshot.docs.map((subDoc) => ({
//             id: subDoc.id,
//             ...subDoc.data(),
//           }))
//           return category
//         }),
//       )
//       setCategories(categoriesData)
//     }
//     fetchCategories()
//   }, [])

//   const handleCategorySubcategorySelect = (categoryId, subcategoryId) => {
//     setSelectedCategory(categoryId)
//     setSelectedSubcategory(subcategoryId)
//   }

//   return (
//     <form className="space-y-4">
//       <div>
//         <Label htmlFor="productName">Product Name</Label>
//         <Input id="productName" placeholder="Enter product name" />
//       </div>
//       <div>
//         <Label>Category/Subcategory</Label>
//         <CategorySubcategoryDropdown categories={categories} onSelect={handleCategorySubcategorySelect} />
//       </div>
//       {/* Add other product fields here */}
//       <Button type="submit">Add Product</Button>
//     </form>
//   )
// }

