"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  ClipboardList,
  History,
  BarChart2,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  LogOut,
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
import { collection, query, getDocs, orderBy, where, doc, getDoc, type Timestamp } from "firebase/firestore"
import { posDb } from "@/firebase/client"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

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

export default function OrderHistory() {
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
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: "RESTAURANT NAME",
    address: "123 Main Street, City",
    phone: "Tel: (123) 456-7890",
  })

  // Get current date and time
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

  // Handle sign out
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

  // Fetch restaurant details
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

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!restaurantId) {
        toast.error("No restaurant ID found. Please log in again.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const q = query(
          collection(posDb, "orders"),
          where("restaurantId", "==", restaurantId), // Filter by restaurantId
          orderBy("createdAt", "desc")
        )
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
        toast.error("Failed to load order history")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [restaurantId])

  // Apply filters
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

  // Toggle order expansion
  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  // View receipt
  const viewReceipt = (order: Order) => {
    setSelectedOrder(order)
    setShowReceiptModal(true)
  }

  // Handle print receipt
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

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("")
    setDateFilter(undefined)
    setStatusFilter("all")
    setPaymentMethodFilter("all")
  }

  if (!restaurantId) {
    return <div>Please log in to access the Order History.</div>
  }

  // JSX remains unchanged
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
          <Link href="/pos/order-list" className="flex flex-col items-center text-gray-500">
            <ClipboardList size={20} />
            <span className="text-xs">Order List</span>
          </Link>
          <Link href="/pos/history" className="flex flex-col items-center text-purple-600">
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

      <div className="flex-1 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Order History</h1>
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
                    {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
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
                <TableHead>Date</TableHead>
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
                filteredOrders.map((order) => (
                  <>
                    <TableRow key={order.id} className="hover:bg-gray-50">
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
                      <TableCell>{order.createdAt.toDate().toLocaleString()}</TableCell>
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
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewReceipt(order)} className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedOrders[order.id] && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <h4 className="font-medium mb-2">Order Items</h4>
                            <div className="space-y-2">
                              {order.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center border-b pb-2">
                                  <div>
                                    <p>{item.name}</p>
                                    <p className="text-sm text-gray-500">
                                      Rs {item.price.toLocaleString()} x {item.quantity}
                                    </p>
                                  </div>
                                  <p className="font-medium">Rs {(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                              ))}
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
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
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
    </div>
  )
}