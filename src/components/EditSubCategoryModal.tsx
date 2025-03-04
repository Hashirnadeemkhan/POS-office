"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Category {
  id: string
  name: string
}

interface Subcategory {
  id: string
  name: string
  description: string
  categoryId: string
  categoryName?: string
}

interface EditSubcategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdateSubcategory: (id: string, name: string, description: string, categoryId: string) => void
  subcategory: Subcategory | null
  categories: Category[]
}

export function EditSubcategoryModal({
  isOpen,
  onClose,
  onUpdateSubcategory,
  subcategory,
  categories,
}: EditSubcategoryModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({ name: "", categoryId: "" })

  useEffect(() => {
    if (subcategory) {
      setName(subcategory.name)
      setDescription(subcategory.description || "")
      setCategoryId(subcategory.categoryId)
    }
  }, [subcategory])

  const validateForm = () => {
    const newErrors = { name: "", categoryId: "" }
    let isValid = true

    if (!name.trim()) {
      newErrors.name = "Subcategory name is required"
      isValid = false
    }

    if (!categoryId) {
      newErrors.categoryId = "Parent category is required"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !subcategory) return

    setIsSubmitting(true)

    try {
      await onUpdateSubcategory(subcategory.id, name, description, categoryId)
      onClose()
    } catch (error) {
      console.error("Error in form submission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Subcategory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Parent Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="edit-category" className={errors.categoryId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-name">Subcategory Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="mt-2" type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="mt-2" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Subcategory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

