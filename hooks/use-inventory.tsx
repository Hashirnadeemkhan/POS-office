"use client"

import { useState, useEffect } from "react"
import { InventoryManager,ProductStock } from "@/lib/inventory-manage"
import { useAuth } from "@/lib/auth-context"

export function useInventory() {
  const { userId } = useAuth()
  const [stockMap, setStockMap] = useState<Record<string, ProductStock>>({})
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    if (!userId) return
    
    const inventoryManager = InventoryManager.getInstance()
    inventoryManager.setRestaurantId(userId)
    
    const initializeInventory = async () => {
      setIsLoading(true)
      await inventoryManager.initializeStock()
      setStockMap(inventoryManager.getAllStock())
      setIsLoading(false)
    }
    
    const handleStockUpdate = () => {
      setStockMap(inventoryManager.getAllStock())
    }
    
    inventoryManager.addListener(handleStockUpdate)
    initializeInventory()
    
    return () => {
      inventoryManager.removeListener(handleStockUpdate)
    }
  }, [userId])
  
  const getProductStock = (productId: string, variantId?: string): ProductStock | null => {
    const inventoryManager = InventoryManager.getInstance()
    return inventoryManager.getProductStock(productId, variantId)
  }
  
  const isProductAvailable = (productId: string, variantId?: string, quantity: number = 1): boolean => {
    const inventoryManager = InventoryManager.getInstance()
    return inventoryManager.isProductAvailable(productId, variantId, quantity)
  }
  
  const updateProductQuantity = async (productId: string, newQuantity: number): Promise<void> => {
    const inventoryManager = InventoryManager.getInstance()
    await inventoryManager.updateProductQuantity(productId, newQuantity)
  }
  
  const updateVariantStock = async (productId: string, variantId: string, newStock: number): Promise<void> => {
    const inventoryManager = InventoryManager.getInstance()
    await inventoryManager.updateVariantStock(productId, variantId, newStock)
  }
  
  const processOrder = async (items: any[]): Promise<boolean> => {
    const inventoryManager = InventoryManager.getInstance()
    return await inventoryManager.processOrder(items)
  }
  
  return {
    stockMap,
    isLoading,
    getProductStock,
    isProductAvailable,
    updateProductQuantity,
    updateVariantStock,
    processOrder
  }
}
