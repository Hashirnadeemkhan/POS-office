"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { collection, getDocs, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ProductFilterProps {
  onCategoryChange: (category: string) => void
  onSubcategoryChange: (subcategory: string) => void
}

export function ProductFilter({ onCategoryChange, onSubcategoryChange }: ProductFilterProps) {
  const [categories, setCategories] = useState<string[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

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

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    onCategoryChange(value)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="category-filter" className="text-sm whitespace-nowrap">
          Category:
        </Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger id="category-filter" className="w-[180px]">
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

      <div className="flex items-center gap-2">
        <Label htmlFor="subcategory-filter" className="text-sm whitespace-nowrap">
          Subcategory:
        </Label>
        <Select value="all" onValueChange={onSubcategoryChange}>
          <SelectTrigger id="subcategory-filter" className="w-[180px]">
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

