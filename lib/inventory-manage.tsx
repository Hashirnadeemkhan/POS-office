import { collection, query, where, getDocs, doc, updateDoc, increment, onSnapshot, Query, QuerySnapshot, DocumentData } from "firebase/firestore"
import { posDb } from "@/firebase/client"

// Types
export interface ProductStock {
  productId: string
  variantId?: string
  name: string
  totalStock: number
  orderedQuantity: number
  availableStock: number
}

export interface OrderItem {
  productId: string
  variantId?: string
  name: string
  price: number
  quantity: number
  image?: string
}

// Class to manage inventory across the application
export class InventoryManager {
  private static instance: InventoryManager
  private stockMap: Record<string, ProductStock> = {}
  private listeners: Array<() => void> = []
  private restaurantId: string | null = null

  private constructor() {}

  public static getInstance(): InventoryManager {
    if (!InventoryManager.instance) {
      InventoryManager.instance = new InventoryManager()
    }
    return InventoryManager.instance
  }

  public setRestaurantId(restaurantId: string): void {
    this.restaurantId = restaurantId
  }

  public async initializeStock(): Promise<void> {
    if (!this.restaurantId) {
      console.error("Restaurant ID not set")
      return
    }

    try {
      // Fetch all products
      const productsQuery: Query<DocumentData> = query(
        collection(posDb, "products"),
        where("restaurantId", "==", this.restaurantId)
      )
      
      const productsSnapshot: QuerySnapshot<DocumentData> = await getDocs(productsQuery)
      
      // Initialize stock map with product quantities
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data()
        const productId: string = productDoc.id
        
        // Add main product stock if it has a quantity field
        if (productData.quantity !== undefined) {
          const key = `${productId}-main`
          this.stockMap[key] = {
            productId,
            name: productData.name,
            totalStock: productData.quantity,
            orderedQuantity: 0,
            availableStock: productData.quantity
          }
        }
        
        // Fetch variants for this product
        const variantsQuery: Query<DocumentData> = query(
          collection(posDb, "variants"),
          where("product_id", "==", productId),
          where("productRestaurantId", "==", this.restaurantId)
        )
        
        const variantsSnapshot: QuerySnapshot<DocumentData> = await getDocs(variantsQuery)
        
        // Add variant stocks
        for (const variantDoc of variantsSnapshot.docs) {
          const variantData = variantDoc.data()
          const variantId: string = variantDoc.id
          
          const key = `${productId}-${variantId}`
          this.stockMap[key] = {
            productId,
            variantId,
            name: `${productData.name} - ${variantData.name}`,
            totalStock: variantData.stock || 0,
            orderedQuantity: 0,
            availableStock: variantData.stock || 0
          }
        }
      }
      
      // Now fetch completed and pending orders to calculate ordered quantities
      await this.updateOrderedQuantities()
      
      // Set up real-time listener for orders
      this.setupOrdersListener()
      
      // Notify listeners
      this.notifyListeners()
    } catch (error) {
      console.error("Error initializing stock:", error)
    }
  }

  private async updateOrderedQuantities(): Promise<void> {
    if (!this.restaurantId) return
    
    try {
      const ordersQuery: Query<DocumentData> = query(
        collection(posDb, "orders"),
        where("restaurantId", "==", this.restaurantId),
        where("status", "in", ["completed", "pending"])
      )
      
      const ordersSnapshot: QuerySnapshot<DocumentData> = await getDocs(ordersQuery)
      
      // Reset ordered quantities
      Object.keys(this.stockMap).forEach(key => {
        this.stockMap[key].orderedQuantity = 0
      })
      
      // Update ordered quantities from orders
      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data()
        
        if (orderData.items && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            // Try main product first
            const mainKey = `${item.productId}-main`
            if (this.stockMap[mainKey]) {
              this.stockMap[mainKey].orderedQuantity += item.quantity
              this.stockMap[mainKey].availableStock = Math.max(
                0, 
                this.stockMap[mainKey].totalStock - this.stockMap[mainKey].orderedQuantity
              )
            }
            
            // If item has a variantId, update that variant's stock
            if (item.variantId) {
              const variantKey = `${item.productId}-${item.variantId}`
              if (this.stockMap[variantKey]) {
                this.stockMap[variantKey].orderedQuantity += item.quantity
                this.stockMap[variantKey].availableStock = Math.max(
                  0, 
                  this.stockMap[variantKey].totalStock - this.stockMap[variantKey].orderedQuantity
                )
              }
            }
          }
        }
      }
      
      this.notifyListeners()
    } catch (error) {
      console.error("Error updating ordered quantities:", error)
    }
  }

  private setupOrdersListener(): void {
    if (!this.restaurantId) return
    
    const ordersQuery: Query<DocumentData> = query(
      collection(posDb, "orders"),
      where("restaurantId", "==", this.restaurantId)
    )
    
    onSnapshot(ordersQuery, () => {
      this.updateOrderedQuantities()
    })
  }

  public getProductStock(productId: string, variantId?: string): ProductStock | null {
    const key = variantId ? `${productId}-${variantId}` : `${productId}-main`
    return this.stockMap[key] || null
  }

  public getAllStock(): Record<string, ProductStock> {
    return { ...this.stockMap }
  }

  public isProductAvailable(productId: string, variantId?: string, quantity: number = 1): boolean {
    const stock = this.getProductStock(productId, variantId)
    return stock ? stock.availableStock >= quantity : false
  }

  public async updateProductQuantity(productId: string, newQuantity: number): Promise<void> {
    if (!this.restaurantId) return
    
    try {
      const productRef = doc(posDb, "products", productId)
      await updateDoc(productRef, { quantity: newQuantity })
      
      const key = `${productId}-main`
      if (this.stockMap[key]) {
        this.stockMap[key].totalStock = newQuantity
        this.stockMap[key].availableStock = Math.max(
          0, 
          newQuantity - this.stockMap[key].orderedQuantity
        )
        this.notifyListeners()
      }
    } catch (error) {
      console.error("Error updating product quantity:", error)
    }
  }

  public async updateVariantStock(productId: string, variantId: string, newStock: number): Promise<void> {
    if (!this.restaurantId) return
    
    try {
      const variantRef = doc(posDb, "variants", variantId)
      await updateDoc(variantRef, { stock: newStock })
      
      const key = `${productId}-${variantId}`
      if (this.stockMap[key]) {
        this.stockMap[key].totalStock = newStock
        this.stockMap[key].availableStock = Math.max(
          0, 
          newStock - this.stockMap[key].orderedQuantity
        )
        this.notifyListeners()
      }
    } catch (error) {
      console.error("Error updating variant stock:", error)
    }
  }

  public async processOrder(items: OrderItem[]): Promise<boolean> {
    if (!this.restaurantId) return false
    
    try {
      // First check if all items are available
      for (const item of items) {
        const stock = this.getProductStock(item.productId, item.variantId)
        if (!stock || stock.availableStock < item.quantity) {
          return false // Not enough stock
        }
      }
      
      // Update stock in Firestore
      for (const item of items) {
        if (item.variantId) {
          // Update variant stock
          const variantRef = doc(posDb, "variants", item.variantId)
          await updateDoc(variantRef, {
            stock: increment(-item.quantity)
          })
        } else {
          // Update product quantity
          const productRef = doc(posDb, "products", item.productId)
          await updateDoc(productRef, {
            quantity: increment(-item.quantity)
          })
        }
      }
      
      return true
    } catch (error) {
      console.error("Error processing order:", error)
      return false
    }
  }

  public addListener(listener: () => void): void {
    this.listeners.push(listener)
  }

  public removeListener(listener: () => void): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }
}

// Hook to use the inventory manager
export function useInventory() {
  return InventoryManager.getInstance()
}