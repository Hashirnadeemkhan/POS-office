"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ProductFilterProps {
  onCategoryChange: (category: string) => void
  onSubcategoryChange: (subcategory: string) => void
}

export function ProductFilter({ onCategoryChange, onSubcategoryChange }: ProductFilterProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "categories"))
      const categoryList = querySnapshot.docs.map((doc) => doc.data().name)
      setCategories(categoryList)
    }

    const fetchSubcategories = async () => {
      const querySnapshot = await getDocs(collection(db, "subcategories"))
      const subcategoryList = querySnapshot.docs.map((doc) => doc.data().name)
      setSubcategories(subcategoryList)
    }

    fetchCategories()
    fetchSubcategories()
  }, [])

  return (
    <div className="flex space-x-4">
      <div>
        <Label htmlFor="category-filter">Category</Label>
        <Select onValueChange={onCategoryChange}>
          <SelectTrigger id="category-filter">
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
        <Label htmlFor="subcategory-filter">Subcategory</Label>
        <Select onValueChange={onSubcategoryChange}>
          <SelectTrigger id="subcategory-filter">
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
  )
}

