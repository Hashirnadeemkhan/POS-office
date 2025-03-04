"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category: string
  subcategory: string
}

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdateProduct: (id: string, product: Omit<Product, "id">) => void
  product: Product | null
}

export function EditProductModal({ isOpen, onClose, onUpdateProduct, product }: EditProductModalProps) {
  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [category, setCategory] = useState("")
  const [subcategory, setSubcategory] = useState("")

  useEffect(() => {
    if (product) {
      setName(product.name)
      setSku(product.sku)
      setPrice(product.price.toString())
      setStock(product.stock.toString())
      setCategory(product.category)
      setSubcategory(product.subcategory)
    }
  }, [product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (product) {
      onUpdateProduct(product.id, {
        name,
        sku,
        price: Number.parseFloat(price),
        stock: Number.parseInt(stock),
        category,
        subcategory,
      })
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={setCategory} value={category} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {/* Add your categories here */}
                <SelectItem value="category1">Category 1</SelectItem>
                <SelectItem value="category2">Category 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subcategory">Subcategory</Label>
            <Select onValueChange={setSubcategory} value={subcategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a subcategory" />
              </SelectTrigger>
              <SelectContent>
                {/* Add your subcategories here */}
                <SelectItem value="subcategory1">Subcategory 1</SelectItem>
                <SelectItem value="subcategory2">Subcategory 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Update Product</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

