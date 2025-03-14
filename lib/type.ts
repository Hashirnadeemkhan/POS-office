export interface OrderItem {
    id: string
    name: string
    quantity: number
    unitPrice: number
    price: number // Total price for this item (quantity * unitPrice)
  }
  
  export interface Order {
    id: string
    items: OrderItem[]
    subtotal: number
    tax: number
    taxRate?: number
    discount: number
    total: number
    paymentMethod: string
    amountPaid?: number
    cashierName?: string
    customerName?: string
    customerPhone?: string
    createdAt: number | string | Date
    status: "completed" | "pending" | "cancelled"
  }
  