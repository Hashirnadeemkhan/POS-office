export interface Category {
    id: string
    name: string
    icon: string
    itemCount: number
  }
  
  export interface MenuItem {
    id: string
    name: string
    description?: string
    price: number
    imageUrl: string
    categoryId: string
    available: boolean
  }
  
  export interface User {
    id: string
    displayName: string
    email: string
    role: string
    photoURL?: string
  }
  
  export interface Order {
    id: string
    items: OrderItem[]
    total: number
    status: "pending" | "completed" | "cancelled"
    createdAt: Date
    updatedAt: Date
    createdBy: string
  }
  
  export interface OrderItem {
    menuItemId: string
    name: string
    price: number
    quantity: number
    subtotal: number
  }
  
  