"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  ClipboardList,
  History,
  BarChart2,
  Search,
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  LogOut,
  Check,
  X,
  AlertTriangle,
  Calendar,
  Package,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  Timestamp,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore"
import { posDb } from "@/firebase/client"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"

// Types
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
  createdAt: Timestamp
  restaurantId: string
}

interface VariantAttribute {
  id: string
  key_name: string
  value_name: string
}

interface Variant {
  id: string
  name: string
  price: number
  stock: number
  attributes: VariantAttribute[]
  image_url?: string
  productRestaurantId?: string
}

interface Product {
  id: string
  name: string
  sku: string
  base_price?: number
  quantity?: number
  description?: string
  status?: "active" | "inactive"
  category?: string
  subcategory?: string
  variants: Variant[]
  main_image_url?: string
  gallery_images?: string[]
  restaurantId?: string
}

interface Category {
  id: string
  name: string
  restaurantId?: string
}

interface Subcategory {
  id: string
  name: string
  categoryId: string
  restaurantId?: string
}

// New interface for stock tracking
interface ProductStock {
  productId: string
  variantId: string
  name: string
  orderedQuantity: number
  availableStock: number
  totalStock: number
}

export default function OrderList() {
  const router = useRouter()
  const { userId } = useAuth()
  const restaurantId = userId
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<"complete" | "cancel" | "refund" | null>(null)
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: "RESTAURANT NAME",
    address: "123 Main Street, City",
    phone: "Tel: (123) 456-7890",
  })
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchProductTerm, setSearchProductTerm] = useState("")
  const [productStockMap, setProductStockMap] = useState<Record<string, ProductStock>>({})

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
      const response = await fetch("/api/pos/logout", {
        method: "POST",
        headers: {
          "x-session-token": localStorage.getItem("sessionToken") || "",
        },
      })
      if (!response.ok) throw new Error("Logout failed")
      localStorage.removeItem("sessionToken")
      router.replace("/pos/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantId) return
      try {
        const restaurantRef = doc(posDb, "restaurants", restaurantId)
        const restaurantSnap = await getDoc(restaurantRef)
        if (restaurantSnap.exists()) {
          const data = restaurantSnap.data()
          setRestaurantDetails({
            name: data.name || "RESTAURANT NAME",
            address: data.address || "123 Main Street, City",
            phone: data.phoneNumber || "Tel: (123) 456-7890",
          })
        }
      } catch (error) {
        console.error("Error fetching restaurant details:", error)
        toast.error("Failed to load restaurant details")
      }
    }
    fetchRestaurantData()
  }, [restaurantId])

  useEffect(() => {
    const fetchOrders = async () => {
      if (!restaurantId) {
        toast.error("No restaurant ID found. Please log in again.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        let q
        if (dateFilter) {
          const selectedDate = new Date(dateFilter)
          selectedDate.setHours(0, 0, 0, 0)
          const nextDay = new Date(selectedDate)
          nextDay.setDate(nextDay.getDate() + 1)

          const startTimestamp = Timestamp.fromDate(selectedDate)
          const endTimestamp = Timestamp.fromDate(nextDay)

          q = query(
            collection(posDb, "orders"),
            where("restaurantId", "==", restaurantId),
            where("createdAt", ">=", startTimestamp),
            where("createdAt", "<", endTimestamp),
            orderBy("createdAt", "desc"),
          )
        } else {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          const startTimestamp = Timestamp.fromDate(today)
          const endTimestamp = Timestamp.fromDate(tomorrow)

          q = query(
            collection(posDb, "orders"),
            where("restaurantId", "==", restaurantId),
            where("createdAt", ">=", startTimestamp),
            where("createdAt", "<", endTimestamp),
            orderBy("createdAt", "desc"),
          )
        }

        const querySnapshot = await getDocs(q)
        const ordersData: Order[] = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            items: data.items || [],
            subtotal: data.subtotal || 0,
            tax: data.tax || 0,
            total: data.total || 0,
            paymentMethod: data.paymentMethod || "cash",
            status: data.status || "completed",
            createdAt: data.createdAt,
            restaurantId: data.restaurantId,
          }
        })

        setOrders(ordersData)
        setFilteredOrders(ordersData)
      } catch (error) {
        console.error("Error fetching orders:", error)
        toast.error("Failed to load orders")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [restaurantId, dateFilter])

  useEffect(() => {
    if (!restaurantId) return

    const fetchProducts = async () => {
      try {
        let q = query(collection(posDb, "products"), where("restaurantId", "==", restaurantId), orderBy("name"))

        if (categoryFilter !== "all") {
          q = query(q, where("category", "==", categoryFilter))
        }

        const unsubscribe = onSnapshot(
          q,
          async (querySnapshot) => {
            const productsData: Product[] = []

            for (const docSnapshot of querySnapshot.docs) {
              const productData = docSnapshot.data()

              const variantsQuery = query(
                collection(posDb, "variants"),
                where("product_id", "==", docSnapshot.id),
                where("productRestaurantId", "==", restaurantId),
              )
              const variantsSnapshot = await getDocs(variantsQuery)
              const variants: Variant[] = []

              for (const variantDoc of variantsSnapshot.docs) {
                const variantData = variantDoc.data()

                const attributesQuery = query(
                  collection(posDb, "variant_attributes"),
                  where("variant_id", "==", variantDoc.id),
                  where("variantRestaurantId", "==", restaurantId),
                )
                const attributesSnapshot = await getDocs(attributesQuery)
                const attributes = attributesSnapshot.docs.map((attrDoc) => ({
                  id: attrDoc.id,
                  ...attrDoc.data(),
                })) as VariantAttribute[]

                variants.push({
                  id: variantDoc.id,
                  name: variantData.name || "",
                  price: variantData.price || 0,
                  stock: variantData.stock || 0,
                  attributes,
                  image_url: variantData.image_url || "",
                  productRestaurantId: variantData.productRestaurantId,
                })
              }

              productsData.push({
                id: docSnapshot.id,
                name: productData.name || "",
                sku: productData.sku || "",
                base_price: productData.base_price,
                quantity: productData.quantity || 0,
                description: productData.description,
                status: productData.status,
                category: productData.category,
                subcategory: productData.subcategory,
                variants,
                main_image_url: productData.main_image_url || "",
                gallery_images: productData.gallery_images || [],
                restaurantId: productData.restaurantId,
              })
            }

            setProducts(productsData)
          },
          (error) => {
            console.error("Error fetching products:", error)
            toast.error("Failed to load products")
          },
        )

        return () => unsubscribe()
      } catch (error) {
        console.error("Error setting up products listener:", error)
        toast.error("Failed to set up products listener.")
      }
    }

    fetchProducts()
  }, [restaurantId, categoryFilter])

  useEffect(() => {
    if (!restaurantId) return

    const q = query(collection(posDb, "categories"), where("restaurantId", "==", restaurantId), orderBy("name"))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const categoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          restaurantId: doc.data().restaurantId,
        }))
        setCategories(categoriesList)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast.error("Failed to load categories.")
      },
    )
    return () => unsubscribe()
  }, [restaurantId])

  // Calculate stock based on orders and products
  useEffect(() => {
    const calculateStock = () => {
      const stockMap: Record<string, ProductStock> = {}

      // Initialize stock from products
      products.forEach((product) => {
        // For products with quantity field
        if (product.quantity !== undefined) {
          const key = `${product.id}-main`
          stockMap[key] = {
            productId: product.id,
            variantId: "main",
            name: product.name,
            orderedQuantity: 0,
            availableStock: product.quantity,
            totalStock: product.quantity,
          }
        }

        // For products with variants
        product.variants.forEach((variant) => {
          const key = `${product.id}-${variant.id}`
          stockMap[key] = {
            productId: product.id,
            variantId: variant.id,
            name: `${product.name} - ${variant.name}`,
            orderedQuantity: 0,
            availableStock: variant.stock,
            totalStock: variant.stock,
          }
        })
      })

      // Update ordered quantities from orders
      orders.forEach((order) => {
        if (order.status === "completed" || order.status === "pending") {
          order.items.forEach((item) => {
            // Try to find the product
            const product = products.find((p) => p.id === item.productId)

            if (product) {
              // If it's a main product with quantity field
              const mainKey = `${product.id}-main`
              if (stockMap[mainKey]) {
                stockMap[mainKey].orderedQuantity += item.quantity
                stockMap[mainKey].availableStock = Math.max(
                  0,
                  stockMap[mainKey].totalStock - stockMap[mainKey].orderedQuantity,
                )
              }

              // If it's a variant
              product.variants.forEach((variant) => {
                const variantKey = `${product.id}-${variant.id}`
                if (stockMap[variantKey]) {
                  stockMap[variantKey].orderedQuantity += item.quantity
                  stockMap[variantKey].availableStock = Math.max(
                    0,
                    stockMap[variantKey].totalStock - stockMap[variantKey].orderedQuantity,
                  )
                }
              })
            }
          })
        }
      })

      setProductStockMap(stockMap)
    }

    if (products.length > 0 && orders.length > 0) {
      calculateStock()
    }
  }, [products, orders])

  useEffect(() => {
    let result = orders

    if (searchQuery) {
      result = result.filter(
        (order) =>
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filterDate.setHours(0, 0, 0, 0)

      result = result.filter((order) => {
        const orderDate = order.createdAt.toDate()
        orderDate.setHours(0, 0, 0, 0)
        return orderDate.getTime() === filterDate.getTime()
      })
    }

    if (statusFilter !== "all") {
      result = result.filter((order) => order.status === statusFilter)
    }

    if (paymentMethodFilter !== "all") {
      result = result.filter((order) => order.paymentMethod === paymentMethodFilter)
    }

    setFilteredOrders(result)
  }, [orders, searchQuery, dateFilter, statusFilter, paymentMethodFilter])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchProductTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchProductTerm.toLowerCase()),
  )

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  const viewReceipt = (order: Order) => {
    setSelectedOrder(order)
    setShowReceiptModal(true)
  }

  const handlePrintReceipt = () => {
    if (!selectedOrder) return

    const receiptWindow = window.open("", "_blank")
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; width: 300px; }
              .header { text-align: center; margin-bottom: 20px; }
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
              <p>${selectedOrder.createdAt.toDate().toLocaleString()}</p>
              <p>Order #: ${selectedOrder.id.slice(-6)}</p>
            </div>
            
            <div class="items">
              <h3>ORDER DETAILS</h3>
              ${selectedOrder.items
                .map(
                  (item) => `
                <div class="item">
                  <div>${item.name} x ${item.quantity}</div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>${item.quantity} x Rs ${item.price.toFixed(2)}</span>
                    <span>Rs ${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>Rs ${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax (10%):</span>
                <span>Rs ${selectedOrder.tax.toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span>TOTAL:</span>
                <span>Rs ${selectedOrder.total.toFixed(2)}</span>
              </div>
              <div style="margin-top: 10px;">
                <span>Payment Method: ${selectedOrder.paymentMethod.toUpperCase()}</span>
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

  const resetFilters = () => {
    setSearchQuery("")
    setDateFilter(undefined)
    setStatusFilter("all")
    setPaymentMethodFilter("all")
  }

  const handleOrderAction = (order: Order, action: "complete" | "cancel" | "refund") => {
    setSelectedOrder(order)
    setActionType(action)
    setShowActionModal(true)
  }

  const confirmOrderAction = async () => {
    if (!selectedOrder || !actionType) return

    try {
      const orderRef = doc(posDb, "orders", selectedOrder.id)

      await updateDoc(orderRef, {
        status: actionType === "complete" ? "completed" : actionType === "cancel" ? "cancelled" : "refunded",
      })

      setOrders(
        orders.map((order) =>
          order.id === selectedOrder.id
            ? {
                ...order,
                status: actionType === "complete" ? "completed" : actionType === "cancel" ? "cancelled" : "refunded",
              }
            : order,
        ),
      )

      toast.success(
        `Order ${selectedOrder.id.slice(-6)} has been ${
          actionType === "complete" ? "completed" : actionType === "cancel" ? "cancelled" : "refunded"
        }`,
      )

      setShowActionModal(false)
    } catch (error) {
      console.error(`Error ${actionType}ing order:`, error)
      toast.error(`Failed to ${actionType} order`)
    }
  }

  // Get product details for an item
  const getProductDetails = (productId: string) => {
    return products.find((p) => p.id === productId)
  }

  // Get stock info for a product
  const getStockInfo = (productId: string) => {
    // Try main product first
    const mainKey = `${productId}-main`
    if (productStockMap[mainKey]) {
      return productStockMap[mainKey]
    }

    // Try variants
    const product = products.find((p) => p.id === productId)
    if (product && product.variants.length > 0) {
      const variantKey = `${productId}-${product.variants[0].id}`
      return productStockMap[variantKey]
    }

    return null
  }

  if (!restaurantId) {
    return <div>Please log in to access the Order List.</div>
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
          <Link href="/pos" className="flex flex-col items-center text-gray-500">
            <Home size={20} />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/pos/order-list" className="flex flex-col items-center text-purple-600">
            <ClipboardList size={20} />
            <span className="text-xs">Order List</span>
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

      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {dateFilter ? format(dateFilter, "MMMM d, yyyy") + " Orders" : "Today's Orders"}
          </h1>
          <Button onClick={resetFilters} variant="outline">
            Reset Filters
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search by order ID or item..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px] justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus />
                </PopoverContent>
              </Popover>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Filter by payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>{dateFilter ? "Date & Time" : "Time"}</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                    No orders found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders
                  .flatMap((order) => [
                    <TableRow key={`row-${order.id}`} className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleOrderExpand(order.id)}
                        >
                          {expandedOrders[order.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                      <TableCell>
                        {dateFilter
                          ? order.createdAt.toDate().toLocaleString()
                          : order.createdAt.toDate().toLocaleTimeString()}
                      </TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>Rs {order.total.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{order.paymentMethod}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : order.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : order.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {order.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOrderAction(order, "complete")}
                                className="h-8 w-8 p-0 text-green-600"
                                title="Complete Order"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOrderAction(order, "cancel")}
                                className="h-8 w-8 p-0 text-red-600"
                                title="Cancel Order"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {order.status === "completed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOrderAction(order, "refund")}
                              className="h-8 w-8 p-0 text-amber-600"
                              title="Refund Order"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewReceipt(order)}
                            className="h-8 w-8 p-0"
                            title="View Receipt"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>,
                    expandedOrders[order.id] && (
                      <TableRow key={`expanded-${order.id}`}>
                        <TableCell colSpan={8} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <h4 className="font-medium mb-2">Order Items</h4>
                            <div className="space-y-2">
                              {order.items.map((item, index) => {
                                const product = getProductDetails(item.productId)
                                const stockInfo = getStockInfo(item.productId)

                                return (
                                  <div
                                    key={`item-${order.id}-${index}`}
                                    className="flex flex-col md:flex-row md:justify-between items-start md:items-center border-b pb-2"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">{item.name}</p>
                                        <Badge variant="outline" className="ml-2">
                                          {item.quantity} × Rs {item.price.toLocaleString()}
                                        </Badge>
                                      </div>

                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <div className="flex items-center text-xs">
                                          <Package className="h-3 w-3 mr-1 text-gray-500" />
                                          <span className="text-gray-600">
                                            Total Quantity: {product?.quantity || stockInfo?.totalStock || 0}
                                          </span>
                                        </div>

                                        <div className="flex items-center text-xs">
                                          <span
                                            className={`${stockInfo?.availableStock === 0 ? "text-red-600" : "text-green-600"} font-medium`}
                                          >
                                            Available: {stockInfo?.availableStock || 0}
                                          </span>
                                        </div>

                                        <div className="flex items-center text-xs">
                                          <span className="text-amber-600 font-medium">
                                            Ordered: {stockInfo?.orderedQuantity || 0}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <p className="font-bold mt-2 md:mt-0">
                                      Rs {(item.price * item.quantity).toLocaleString()}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="mt-4 flex justify-between">
                              <div>
                                <p className="text-sm">Subtotal: Rs {order.subtotal.toLocaleString()}</p>
                                <p className="text-sm">Tax: Rs {order.tax.toLocaleString()}</p>
                                <p className="font-medium">Total: Rs {order.total.toLocaleString()}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => viewReceipt(order)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <Printer className="mr-2 h-4 w-4" /> Print Receipt
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ),
                  ])
                  .filter(Boolean)
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Product Inventory Status</h2>
          </div>

          <div className="p-4 border-b">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchProductTerm}
                  onChange={(e) => setSearchProductTerm(e.target.value)}
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Total Quantity</TableHead>
                  <TableHead className="text-center">Ordered</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                      No products found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const stockKey = `${product.id}-main`
                    const stockInfo = productStockMap[stockKey]
                    const totalQuantity = product.quantity || 0
                    const orderedQuantity = stockInfo?.orderedQuantity || 0
                    const availableQuantity = stockInfo?.availableStock || totalQuantity

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category || "N/A"}</TableCell>
                        <TableCell className="text-center">{totalQuantity}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-amber-600 font-medium">{orderedQuantity}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={availableQuantity <= 5 ? "text-red-600 font-bold" : "text-green-600 font-medium"}
                          >
                            {availableQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              availableQuantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {availableQuantity > 0 ? "In Stock" : "Out of Stock"}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Receipt</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4 border rounded-lg p-4 bg-white">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg">{restaurantDetails.name}</h3>
                <p className="text-sm">{restaurantDetails.address}</p>
                <p className="text-sm">{restaurantDetails.phone}</p>
                <p className="text-sm">{selectedOrder.createdAt.toDate().toLocaleString()}</p>
                <p className="text-sm">Order #: {selectedOrder.id.slice(-6)}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-sm border-b pb-1 mb-2">ORDER DETAILS</h4>
                {selectedOrder.items.map((item, index) => (
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
                  <span>Rs {selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%):</span>
                  <span>Rs {selectedOrder.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold mt-1">
                  <span>TOTAL:</span>
                  <span>Rs {selectedOrder.total.toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm">
                  <span>Payment Method: {selectedOrder.paymentMethod.toUpperCase()}</span>
                </div>
              </div>

              <div className="text-center mt-4 text-sm">
                <p>Thank you for your purchase!</p>
                <p>Please come again</p>
              </div>
            </div>
          )}
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

      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "complete" ? "Complete Order" : actionType === "cancel" ? "Cancel Order" : "Refund Order"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to{" "}
              {actionType === "complete" ? "complete" : actionType === "cancel" ? "cancel" : "refund"}
              order #{selectedOrder?.id.slice(-6)}?
            </p>
            {actionType === "refund" && (
              <p className="mt-2 text-amber-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                This will mark the order as refunded and update the reports.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmOrderAction}
              className={
                actionType === "complete"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "cancel"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-amber-600 hover:bg-amber-700"
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

