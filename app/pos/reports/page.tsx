"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  ClipboardList,
  History,
  BarChart2,
  Calendar,
  Download,
  LogOut,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { collection, query, getDocs, where, Timestamp, orderBy } from "firebase/firestore"
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

interface SalesData {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topSellingItems: {
    name: string
    quantity: number
    revenue: number
  }[]
  paymentMethodBreakdown: {
    cash: number
    card: number
    wallet: number
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const { userId, logout } = useAuth() // Get userId and logout from auth context
  const restaurantId = userId // Use userId as restaurantId
  const [orders, setOrders] = useState<Order[]>([])
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topSellingItems: [],
    paymentMethodBreakdown: {
      cash: 0,
      card: 0,
      wallet: 0,
    },
  })
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today")
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()))
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()))
  const [isLoading, setIsLoading] = useState(true)

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
      await logout() // Use logout from auth context
      router.replace("/pos/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  // Update date range based on selection
  useEffect(() => {
    const today = new Date()

    switch (dateRange) {
      case "today":
        setStartDate(startOfDay(today))
        setEndDate(endOfDay(today))
        break
      case "week":
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }))
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }))
        break
      case "month":
        setStartDate(startOfMonth(today))
        setEndDate(endOfMonth(today))
        break
      // For custom, we don't change the dates here
    }
  }, [dateRange])

  // Fetch orders based on date range and restaurantId
  useEffect(() => {
    const fetchOrders = async () => {
      if (!restaurantId) {
        toast.error("No restaurant ID found. Please log in again.")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const startTimestamp = Timestamp.fromDate(startDate)
        const endTimestamp = Timestamp.fromDate(endDate)

        const q = query(
          collection(posDb, "orders"),
          where("restaurantId", "==", restaurantId), // Filter by restaurantId
          where("createdAt", ">=", startTimestamp),
          where("createdAt", "<=", endTimestamp),
          orderBy("createdAt", "desc") // Explicitly order by createdAt
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
        processOrdersData(ordersData)
      } catch (error) {
        console.error("Error fetching orders:", error)
        toast.error("Failed to load reports data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [startDate, endDate, restaurantId])

  // Process orders data to generate reports
  const processOrdersData = (orders: Order[]) => {
    const completedOrders = orders.filter((order) => order.status === "completed")

    const totalSales = completedOrders.reduce((sum, order) => sum + order.total, 0)
    const totalOrders = completedOrders.length
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    const paymentMethodBreakdown = {
      cash: completedOrders.filter((order) => order.paymentMethod === "cash").length,
      card: completedOrders.filter((order) => order.paymentMethod === "card").length,
      wallet: completedOrders.filter((order) => order.paymentMethod === "wallet").length,
    }

    const itemsMap = new Map<string, { quantity: number; revenue: number }>()

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const existingItem = itemsMap.get(item.name)
        if (existingItem) {
          existingItem.quantity += item.quantity
          existingItem.revenue += item.price * item.quantity
          itemsMap.set(item.name, existingItem)
        } else {
          itemsMap.set(item.name, {
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          })
        }
      })
    })

    const topSellingItems = Array.from(itemsMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    setSalesData({
      totalSales,
      totalOrders,
      averageOrderValue,
      topSellingItems,
      paymentMethodBreakdown,
    })
  }

  // Export report as CSV
  const exportReportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,"

    csvContent += "Report Period," + format(startDate, "PP") + " to " + format(endDate, "PP") + "\n\n"

    csvContent += "Total Sales,Rs " + salesData.totalSales.toLocaleString() + "\n"
    csvContent += "Total Orders," + salesData.totalOrders + "\n"
    csvContent += "Average Order Value,Rs " + salesData.averageOrderValue.toLocaleString() + "\n\n"

    csvContent += "Payment Method Breakdown\n"
    csvContent += "Cash," + salesData.paymentMethodBreakdown.cash + "\n"
    csvContent += "Card," + salesData.paymentMethodBreakdown.card + "\n"
    csvContent += "Digital Wallet," + salesData.paymentMethodBreakdown.wallet + "\n\n"

    csvContent += "Top Selling Items\n"
    csvContent += "Item,Quantity,Revenue\n"
    salesData.topSellingItems.forEach((item) => {
      csvContent += item.name + "," + item.quantity + ",Rs " + item.revenue.toLocaleString() + "\n"
    })

    csvContent += "\nOrder Details\n"
    csvContent += "Order ID,Date,Total,Payment Method,Status\n"
    orders.forEach((order) => {
      csvContent +=
        order.id +
        "," +
        order.createdAt.toDate().toLocaleString() +
        "," +
        "Rs " +
        order.total.toLocaleString() +
        "," +
        order.paymentMethod +
        "," +
        order.status +
        "\n"
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `sales_report_${format(startDate, "yyyy-MM-dd")}_to_${format(endDate, "yyyy-MM-dd")}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!restaurantId) {
    return <div>Please log in to access the Reports page.</div>
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
          <Link href="/pos/history" className="flex flex-col items-center text-gray-500">
            <History size={20} />
            <span className="text-xs">History</span>
          </Link>
          <Link href="/pos/reports" className="flex flex-col items-center text-purple-600">
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
          <h1 className="text-2xl font-bold">Sales Reports</h1>
          <Button onClick={exportReportCSV} className="bg-purple-600 hover:bg-purple-700">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium">Date Range:</label>
              <Select
                value={dateRange}
                onValueChange={(value: "today" | "week" | "month" | "custom") => setDateRange(value)}
              >
                <SelectTrigger className="w-[180px] mt-1">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium">Start Date:</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="mt-1">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(startOfDay(date))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium">End Date:</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="mt-1">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(endDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(endOfDay(date))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="ml-auto text-sm text-gray-500">
              Showing data from {format(startDate, "PPP")} to {format(endDate, "PPP")}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rs {salesData.totalSales.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">From {salesData.totalOrders} orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Rs {salesData.averageOrderValue.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">Per order average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesData.totalOrders}</div>
                  <p className="text-xs text-gray-500 mt-1">Completed orders</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="top-items">
              <TabsList className="mb-4">
                <TabsTrigger value="top-items">Top Selling Items</TabsTrigger>
                <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
              </TabsList>

              <TabsContent value="top-items">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Selling Items</CardTitle>
                    <CardDescription>The most popular items by quantity sold</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salesData.topSellingItems.length === 0 ? (
                      <p className="text-center py-8 text-gray-500">No sales data available for this period</p>
                    ) : (
                      <div className="space-y-4">
                        {salesData.topSellingItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between border-b pb-2">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-500">Quantity sold: {item.quantity}</p>
                            </div>
                            <p className="font-bold">Rs {item.revenue.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payment-methods">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Breakdown of orders by payment method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salesData.totalOrders === 0 ? (
                      <p className="text-center py-8 text-gray-500">No payment data available for this period</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">Cash</p>
                              <p className="text-sm text-gray-500">
                                {Math.round((salesData.paymentMethodBreakdown.cash / salesData.totalOrders) * 100)}% of
                                orders
                              </p>
                            </div>
                          </div>
                          <p className="font-bold">{salesData.paymentMethodBreakdown.cash} orders</p>
                        </div>

                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">Credit/Debit Card</p>
                              <p className="text-sm text-gray-500">
                                {Math.round((salesData.paymentMethodBreakdown.card / salesData.totalOrders) * 100)}% of
                                orders
                              </p>
                            </div>
                          </div>
                          <p className="font-bold">{salesData.paymentMethodBreakdown.card} orders</p>
                        </div>

                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium">Digital Wallet</p>
                              <p className="text-sm text-gray-500">
                                {Math.round((salesData.paymentMethodBreakdown.wallet / salesData.totalOrders) * 100)}%
                                of orders
                              </p>
                            </div>
                          </div>
                          <p className="font-bold">{salesData.paymentMethodBreakdown.wallet} orders</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}