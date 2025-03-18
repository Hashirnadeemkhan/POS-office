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
  

  export interface RestaurantAccount {
    id: string; // Firebase UID
    restaurantName: string;
    restaurantType: string;
    email: string;
    ownerName: string;
    activationToken: string;
    status: 'active' | 'deactive';
    createdAt: string;
  }
  
  export interface CreateRestaurantInput {
    restaurantName: string;
    restaurantType: string;
    email: string;
    password: string;
    ownerName: string;
  }
  
  export interface UpdateRestaurantInput {
    restaurantName?: string;
    restaurantType?: string;
    ownerName?: string;
  }