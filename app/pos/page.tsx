"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Home,
  ClipboardList,
  History,
  BarChart2,
  Search,
  MinusCircle,
  PlusCircle,
  LogOut,
  Printer,
  CreditCard,
  DollarSign,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { collection, query, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import {  posDb } from "@/firebase/client" // Added posDb
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  sku: string
  base_price: number
  description?: string
  status?: "active" | "inactive"
  category?: string
  subcategory?: string
  main_image_url?: string
  gallery_images?: string[]
}

interface Category {
  id: string
  name: string
  icon: string
  itemCount: number
}

interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface Order {
  id: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  status: string
  createdAt: Date
  customerName?: string
  customerPhone?: string
}

export default function POS() {
  const { logout, userId } = useAuth() // Added userId from useAuth
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [tax, setTax] = useState(0)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const TAX_RATE = 0.1 // 10% tax rate
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: "RESTAURANT NAME",
    address: "123 Main Street, City",
    phone: "Tel: (123) 456-7890",
  })

  const currentDate = new Date()
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const formattedTime = currentDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  const handleSignOut = async () => {
    try {
      await logout()
      router.replace("/pos/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  const fetchRestaurantData = useCallback(async () => {
    if (!userId) return // Use userId from auth context
    try {
      const restaurantRef = doc(posDb, "restaurants", userId)
      const restaurantSnap = await getDoc(restaurantRef)

      if (restaurantSnap.exists()) {
        const data = restaurantSnap.data()
        setRestaurantDetails({
          name: data.name || "RESTAURANT NAME",
          address: data.address || "123 Main Street, City",
          phone: data.phoneNumber || "Tel: (123) 456-7890",
        })
      } else {
        console.error("Restaurant document not found")
        toast.error("Failed to load restaurant details")
      }
    } catch (error) {
      console.error("Error fetching restaurant details:", error)
      toast.error("Failed to load restaurant details")
    }
  }, [userId])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const categoriesSnapshot = await getDocs(query(collection(posDb, "categories"), orderBy("name")))
      const categoriesData: Category[] = [
        {
          id: "all",
          name: "All Menu",
          icon: "menu",
          itemCount: 0,
        },
      ]

      categoriesSnapshot.forEach((doc) => {
        const categoryData = doc.data()
        categoriesData.push({
          id: doc.id,
          name: categoryData.name,
          icon: categoryData.icon || getCategoryIconName(categoryData.name),
          itemCount: 0,
        })
      })

      const allProductsSnapshot = await getDocs(query(collection(posDb, "products"), orderBy("name")))
      const allProductsData = allProductsSnapshot.docs
        .filter((doc) => doc.data().status !== "inactive")
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          sku: doc.data().sku || "",
          base_price: doc.data().base_price || 0,
          description: doc.data().description,
          status: doc.data().status,
          category: doc.data().category,
          subcategory: doc.data().subcategory,
          main_image_url: doc.data().main_image_url || "",
          gallery_images: doc.data().gallery_images || [],
        }))

      const updatedCategories = categoriesData.map((category) => {
        if (category.id === "all") {
          return { ...category, itemCount: allProductsData.length }
        }
        const count = allProductsData.filter((product: Product) => product.category === category.name).length
        return { ...category, itemCount: count }
      })

      setCategories(updatedCategories)

      let productsData: Product[] = []
      if (selectedCategory === "all") {
        productsData = allProductsData
      } else {
        const selectedCat = updatedCategories.find((c) => c.id === selectedCategory)
        if (selectedCat) {
          productsData = allProductsData.filter((product) => product.category === selectedCat.name)
        }
      }

      setProducts(productsData)

      const initialQuantities: { [key: string]: number } = {}
      productsData.forEach((product: Product) => {
        initialQuantities[product.id] = 0
      })
      setQuantities(initialQuantities)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchData()
    fetchRestaurantData()
  }, [fetchData, fetchRestaurantData])

  const getCategoryIconName = (categoryName: string): string => {
    const categoryMap: { [key: string]: string } = {
      Appetizers: "appetizer",
      Chicken: "chicken",
      Burgers: "steak",
      Pizza: "menu",
      Salads: "salad",
      Seafood: "seafood",
      Desserts: "dessert",
      Beverages: "beverages",
      Cocktails: "cocktail",
    }
    return categoryMap[categoryName] || "menu"
  }

  const handleQuantityChange = (productId: string, change: number) => {
    setQuantities((prev) => {
      const newQuantity = Math.max(0, (prev[productId] || 0) + change)
      return { ...prev, [productId]: newQuantity }
    })
  }

  useEffect(() => {
    const items: OrderItem[] = []
    let subtotalAmount = 0

    Object.entries(quantities).forEach(([productId, quantity]) => {
      if (quantity > 0) {
        const product = products.find((p) => p.id === productId)
        if (product) {
          const orderItem = {
            productId,
            name: product.name,
            price: product.base_price,
            quantity,
            image: product.main_image_url,
          }
          items.push(orderItem)
          subtotalAmount += product.base_price * quantity
        }
      }
    })

    setOrderItems(items)
    setSubtotal(subtotalAmount)
    const taxAmount = subtotalAmount * TAX_RATE
    setTax(taxAmount)
    setTotal(subtotalAmount + taxAmount)
  }, [quantities, products])

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handlePayment = () => {
    if (orderItems.length === 0) {
      toast.error("Please add items to your order.")
      return
    }
    setShowPaymentModal(true)
  }

  const handleCompleteOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required")
      return
    }
    if (!customerPhone.trim()) {
      toast.error("Phone number is required")
      return
    }
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(customerPhone)) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }

    try {
      const orderData = {
        items: orderItems,
        subtotal,
        tax,
        total,
        paymentMethod,
        status: "completed",
        createdAt: serverTimestamp(),
        customerName,
        customerPhone,
      }

      const docRef = await addDoc(collection(posDb, "orders"), orderData)

      const newOrder: Order = {
        id: docRef.id,
        items: orderItems,
        subtotal,
        tax,
        total,
        paymentMethod,
        status: "completed",
        createdAt: new Date(),
        customerName,
        customerPhone,
      }

      setCurrentOrder(newOrder)
      setShowPaymentModal(false)
      setShowReceiptModal(true)

      const resetQuantities: { [key: string]: number } = {}
      products.forEach((product) => {
        resetQuantities[product.id] = 0
      })
      setQuantities(resetQuantities)

      setCustomerName("")
      setCustomerPhone("")

      toast.success("Order placed successfully!")
    } catch (error) {
      console.error("Error creating order:", error)
      toast.error("Failed to place order.")
    }
  }

  const handlePrintReceipt = () => {
    const receiptWindow = window.open("", "_blank")
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; width: 300px; }
              .header { text-align: center; margin-bottom: 20px; }
              .customer { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
              .items { margin-bottom: 20px; }
              .item { margin-bottom: 5px; }
              .totals { border-top: 1px dashed #000; padding-top: 10px; }
              .total-row { display: flex; justify-content: space-between; }
              .grand-total { font-weight: bold; margin-top: 5px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${restaurantDetails.name}</h2>
              <p>${restaurantDetails.address}</p>
              <p>${restaurantDetails.phone}</p>
              <p>${new Date().toLocaleString()}</p>
              <p>Order #: ${currentOrder?.id.slice(-6)}</p>
            </div>
            
            ${
              currentOrder?.customerName || currentOrder?.customerPhone
                ? `
            <div class="customer">
              <h3>CUSTOMER DETAILS</h3>
              ${currentOrder?.customerName ? `<p>Name: ${currentOrder.customerName}</p>` : ""}
              ${currentOrder?.customerPhone ? `<p>Phone: ${currentOrder.customerPhone}</p>` : ""}
            </div>
            `
                : ""
            }
            
            <div class="items">
              <h3>ORDER DETAILS</h3>
              ${currentOrder?.items
                .map(
                  (item) => `
                <div class="item">
                  <div>${item.name} x ${item.quantity}</div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>${item.quantity} x $${item.price.toFixed(2)}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${currentOrder?.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (10%):</span>
                <span>$${currentOrder?.tax.toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>$${currentOrder?.total.toFixed(2)}</span>
              </div>
              <div style="margin-top: 10px;">
                <span>Payment Method: ${currentOrder?.paymentMethod.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Thank you for your purchase!</p>
              <p>Please come again</p>
            </div>
          </body>
        </html>
      `)
      receiptWindow.document.close()
      receiptWindow.focus()
      receiptWindow.print()
    }
  }

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "menu":
        return (
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-purple-700"
            >
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
              <path d="M12 3v6"></path>
            </svg>
          </div>
        )
      case "appetizer":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M8.21 13.89 7 23l-5-1 9.2-9.2"></path>
              <path d="m10.6 9 4.7 4.7 5.3-5.3c2.1-2.1 2.1-5.5 0-7.6-2.1-2.1-5.5-2.1-7.6 0l-5.3 5.3L10.6 9Z"></path>
              <path d="m17.5 15 1.9 1.9c1.3 1.3 1.3 3.5 0 4.8-1.3 1.3-3.5 1.3-4.8 0L12.7 20"></path>
              <path d="m5 3 4 2v5l-4 2v-9Z"></path>
            </svg>
          </div>
        )
      case "seafood":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
          </div>
        )
      case "chicken":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M15.5 5H18a2 2 0 0 1 2 2v9.8a2 2 0 0 1-2 2h-3.8a2 2 0 0 1-1.7-.9L8 9.8A2 2 0 0 1 8 7.2L12.5 2Z"></path>
              <path d="m2 7 4.5 4.5"></path>
              <path d="m4.5 11.5 3-3"></path>
              <path d="m2 13 3 3"></path>
              <path d="m10 19 2 2"></path>
              <path d="m17 17 3 3"></path>
              <path d="M18 14h.01"></path>
            </svg>
          </div>
        )
      case "steak":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
        )
      case "salad":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M2 22c1.25-.987 2.27-1.975 3.9-2.2a5.56 5.56 0 0 1 3.8 1.5 4 4 0 0 0 6.187-2.353 3.5 3.5 0 0 0 3.69-5.116A3.5 3.5 0 0 0 20.95 8 3.5 3.5 0 1 0 16 3.05a3.5 3.5 0 0 0-5.831 1.373 3.5 3.5 0 0 0-5.116 3.69 4 4 0 0 0-2.348 6.155C3.499 15.42 4.244 16.712 2 22"></path>
            </svg>
          </div>
        )
      case "dessert":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M8.7 11.7c.3.3.6.3.9.3h4.7c.3 0 .6 0 .9-.3.4-.4.4-1.1 0-1.5l-2.1-1.9c-.3-.3-.6-.4-1-.4-.4 0-.7.1-.9.4l-2.1 1.9c-.5.4-.5 1.1-.4 1.5Z"></path>
              <path d="M9 6.9c.3.3.6.5 1 .5.4 0 .7-.2 1-.5L12.4 5c.3-.3.6-.4 1-.4.4 0 .7.1.9.4l2.8 2.7c.3.3.6.4 1 .4H19c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v3.5c0 .6.4 1 1 1h.8c.4 0 .7-.1 1-.4Z"></path>
              <path d="M22 19c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1v-3c0-.6.4-1 1-1h18c.6 0 1 .4 1 1v3Z"></path>
              <path d="M15 15v-2.4c0-.3 0-.6-.3-.9-.4-.4-1.1-.4-1.5 0l-1.2 1.1-1.2-1.1c-.4-.4-1.1-.4-1.5 0-.3.3-.3.6-.3.9V15h6Z"></path>
            </svg>
          </div>
        )
      case "beverages":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="m8 2 1.88 1.88"></path>
              <path d="M14.12 3.88 16 2"></path>
              <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path>
              <path d="M12 20c-3.3 0-6-2.7-6-6v-3h12v3c0 3.3-2.7 6-6 6Z"></path>
              <path d="M6 11v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>
            </svg>
          </div>
        )
      case "cocktail":
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M8 22h8"></path>
              <path d="M12 11v11"></path>
              <path d="m19 3-7 8-7-8Z"></path>
            </svg>
          </div>
        )
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
              <path d="M12 3v6"></path>
            </svg>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="flex-1">
        <header className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 text-white p-2 rounded-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
                <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
                <path d="M12 3v6"></path>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg text-purple-600">POS</h1>
              <p className="text-xs text-gray-500">Easy handle sale</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/pos" className="flex flex-col items-center text-purple-600">
              <Home size={20} />
              <span className="text-xs">Home</span>
            </Link>
            <Link href="/pos/order-list" className="flex flex-col items-center text-gray-500">
              <ClipboardList size={20} />
              <span className="text-xs">Order List</span>
            </Link>
            <Link href="/pos/history" className="flex flex-col items-center text-gray-500">
              <History size={20} />
              <span className="text-xs">History</span>
            </Link>
            <Link href="/pos/reports" className="flex flex-col items-center text-gray-500">
              <BarChart2 size={20} />
              <span className="text-xs">Report</span>
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-purple-600">{formattedDate}</p>
              <p className="text-sm">{formattedTime}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                U
              </div>
              <div>
                <p className="text-sm font-medium">User</p>
                <p className="text-xs text-gray-500">Cashier Staff</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-500"
              title="Sign Out"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </header>

        <div className="flex items-center justify-between px-6 py-4">
          <div className="relative w-96">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search menu here..."
              className="w-full pl-8 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              setShowNewOrderModal(true)
            }}
            className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors"
          >
            New Order
          </Button>
        </div>

        <div className="flex gap-2 px-4 mb-6 overflow-x-auto">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => {
                setIsLoading(true)
                setSelectedCategory(category.id)
              }}
              className={`flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors ${
                selectedCategory === category.id ? "border-2 border-purple-600" : "border border-gray-200"
              }`}
            >
              {getCategoryIcon(category.icon)}
              <p
                className={`text-sm mt-1 ${selectedCategory === category.id ? "text-purple-600 font-medium" : "text-gray-700"}`}
              >
                {category.name}
              </p>
              <p className="text-xs text-gray-500">{category.itemCount} items</p>
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-3 gap-4 px-4 pb-8 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 250px)" }}
        >
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden">
                <div className="relative h-40">
                  <Image
                    src={product.main_image_url || "/placeholder.svg?height=160&width=160"}
                    alt={product.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 line-clamp-1">{product.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <div className="text-xs px-2 py-1 rounded-full inline-block bg-green-100 text-green-800">
                      Available
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full inline-block bg-purple-100 text-purple-800">
                      {product.category || "Uncategorized"}
                    </div>
                  </div>
                  <p className="font-bold text-gray-900 mt-2">Rs {product.base_price.toLocaleString()}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleQuantityChange(product.id, -1)}
                      className="text-purple-600 p-1 rounded-md hover:bg-purple-100"
                      disabled={quantities[product.id] === 0}
                    >
                      <MinusCircle size={20} />
                    </Button>
                    <span className="font-medium">{quantities[product.id] || 0}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleQuantityChange(product.id, 1)}
                      className="text-purple-600 p-1 rounded-md hover:bg-purple-100"
                    >
                      <PlusCircle size={20} />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="w-96 border-l bg-gray-50 p-4 flex flex-col h-screen">
        <h2 className="text-xl font-bold mb-4">Order Summary</h2>
        {orderItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">No items added yet</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {orderItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center mb-4 border-b pb-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Rs {item.price.toLocaleString()} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold">Rs {(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between mb-2">
                <p className="text-gray-600">Subtotal</p>
                <p className="font-medium">Rs {subtotal.toLocaleString()}</p>
              </div>
              <div className="flex justify-between mb-2">
                <p className="text-gray-600">Tax (10%)</p>
                <p className="font-medium">Rs {tax.toLocaleString()}</p>
              </div>
              <div className="flex justify-between mb-4">
                <p className="font-bold">Total</p>
                <p className="font-bold text-lg">Rs {total.toLocaleString()}</p>
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg"
                onClick={handlePayment}
              >
                Place Order
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Method</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4 mb-4">
              <h3 className="font-medium">Customer Information</h3>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="paymentCustomerName">Customer Name</Label>
                <Input
                  id="paymentCustomerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="paymentCustomerPhone">Phone Number</Label>
                <Input
                  id="paymentCustomerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            <h3 className="font-medium mb-3">Payment Method</h3>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              <div className="flex items-center space-x-2 border p-3 rounded-lg">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Cash</p>
                    <p className="text-sm text-gray-500">Pay with cash</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Credit/Debit Card</p>
                    <p className="text-sm text-gray-500">Pay with card</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-3 rounded-lg">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex items-center gap-2 cursor-pointer">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Digital Wallet</p>
                    <p className="text-sm text-gray-500">Pay with digital wallet</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <p className="text-gray-600">Subtotal</p>
              <p className="font-medium">Rs {subtotal.toLocaleString()}</p>
            </div>
            <div className="flex justify-between mb-2">
              <p className="text-gray-600">Tax (10%)</p>
              <p className="font-medium">Rs {tax.toLocaleString()}</p>
            </div>
            <div className="flex justify-between mb-4">
              <p className="font-bold">Total</p>
              <p className="font-bold text-lg">Rs {total.toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteOrder} className="bg-purple-600 hover:bg-purple-700">
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Completed</DialogTitle>
          </DialogHeader>
          <div className="py-4 border rounded-lg p-4 bg-white">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg">{restaurantDetails.name}</h3>
              <p className="text-sm">{restaurantDetails.address}</p>
              <p className="text-sm">{restaurantDetails.phone}</p>
              <p className="text-sm">{new Date().toLocaleString()}</p>
              <p className="text-sm">Order #: {currentOrder?.id.slice(-6)}</p>
            </div>
            {(currentOrder?.customerName || currentOrder?.customerPhone) && (
              <div className="mb-4 border-b pb-2">
                <h4 className="font-bold text-sm mb-1">CUSTOMER DETAILS</h4>
                {currentOrder?.customerName && <p className="text-sm">Name: {currentOrder.customerName}</p>}
                {currentOrder?.customerPhone && <p className="text-sm">Phone: {currentOrder.customerPhone}</p>}
              </div>
            )}
            <div className="mb-4">
              <h4 className="font-bold text-sm border-b pb-1 mb-2">ORDER DETAILS</h4>
              {currentOrder?.items.map((item, index) => (
                <div key={index} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>Rs {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.quantity} x Rs {item.price.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Rs {currentOrder?.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (10%):</span>
                <span>Rs {currentOrder?.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold mt-1">
                <span>TOTAL:</span>
                <span>Rs {currentOrder?.total.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-sm">
                <span>Payment Method: {currentOrder?.paymentMethod.toUpperCase()}</span>
              </div>
            </div>
            <div className="text-center mt-4 text-sm">
              <p>Thank you for your purchase!</p>
              <p>Please come again</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
              Close
            </Button>
            <Button onClick={handlePrintReceipt} className="bg-purple-600 hover:bg-purple-700">
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewOrderModal} onOpenChange={setShowNewOrderModal}>
        <DialogContent className="sm:max-w-[80%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Order</DialogTitle>
            <DialogDescription>Select products and enter customer information for the new order.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div>
              <h3 className="font-medium mb-3">Customer Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Products</h3>
              <div className="relative mb-4">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg overflow-hidden">
                    <div className="relative h-24 bg-gray-100">
                      <Image
                        src={product.main_image_url || "/placeholder.svg?height=96&width=96"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                      <p className="font-bold text-gray-900 text-sm mt-1">Rs {product.base_price.toLocaleString()}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className="text-purple-600 p-1 rounded-md hover:bg-purple-100 h-8 w-8"
                          disabled={quantities[product.id] === 0}
                        >
                          <MinusCircle size={16} />
                        </Button>
                        <span className="font-medium text-sm">{quantities[product.id] || 0}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="text-purple-600 p-1 rounded-md hover:bg-purple-100 h-8 w-8"
                        >
                          <PlusCircle size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOrderModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowNewOrderModal(false)
                toast.success("New order started")
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Start Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

