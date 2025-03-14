// "use client"

// import { useState } from "react"
// import { Search, Filter, ChevronDown, ChevronUp } from "lucide-react"
// import Link from "next/link"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// // Types
// interface Order {
//   id: string
//   tableNumber: string
//   customerName: string
//   items: {
//     name: string
//     quantity: number
//     price: number
//   }[]
//   status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
//   total: number
//   createdAt: Date
// }

// export default function OrderList() {
//   const [searchQuery, setSearchQuery] = useState("")
//   const [statusFilter, setStatusFilter] = useState<string | null>(null)
//   const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

//   // Mock orders data
//   const mockOrders: Order[] = [
//     {
//       id: "ORD-001",
//       tableNumber: "T-01",
//       customerName: "John Doe",
//       items: [
//         { name: "Grilled Chicken Sandwich", quantity: 2, price: 12.99 },
//         { name: "French Fries", quantity: 1, price: 5.99 },
//         { name: "Iced Coffee", quantity: 2, price: 4.99 },
//       ],
//       status: "pending",
//       total: 41.95,
//       createdAt: new Date(Date.now() - 15 * 60000), // 15 minutes ago
//     },
//     {
//       id: "ORD-002",
//       tableNumber: "T-03",
//       customerName: "Jane Smith",
//       items: [
//         { name: "Margherita Pizza", quantity: 1, price: 16.99 },
//         { name: "Caesar Salad", quantity: 1, price: 9.99 },
//         { name: "Mojito", quantity: 1, price: 8.99 },
//       ],
//       status: "preparing",
//       total: 35.97,
//       createdAt: new Date(Date.now() - 30 * 60000), // 30 minutes ago
//     },
//     {
//       id: "ORD-003",
//       tableNumber: "T-05",
//       customerName: "Robert Johnson",
//       items: [
//         { name: "Beef Burger", quantity: 2, price: 14.99 },
//         { name: "Spicy Wings", quantity: 1, price: 11.99 },
//         { name: "Chocolate Cake", quantity: 1, price: 7.99 },
//       ],
//       status: "ready",
//       total: 49.96,
//       createdAt: new Date(Date.now() - 45 * 60000), // 45 minutes ago
//     },
//     {
//       id: "ORD-004",
//       tableNumber: "T-02",
//       customerName: "Emily Davis",
//       items: [
//         { name: "Seafood Pasta", quantity: 1, price: 18.99 },
//         { name: "Vegetable Stir Fry", quantity: 1, price: 13.99 },
//       ],
//       status: "completed",
//       total: 32.98,
//       createdAt: new Date(Date.now() - 60 * 60000), // 60 minutes ago
//     },
//     {
//       id: "ORD-005",
//       tableNumber: "T-07",
//       customerName: "Michael Wilson",
//       items: [
//         { name: "Steak", quantity: 1, price: 24.99 },
//         { name: "Caesar Salad", quantity: 1, price: 9.99 },
//         { name: "Iced Coffee", quantity: 1, price: 4.99 },
//       ],
//       status: "cancelled",
//       total: 39.97,
//       createdAt: new Date(Date.now() - 75 * 60000), // 75 minutes ago
//     },
//   ]

//   // Filter and sort orders
//   const filteredOrders = mockOrders
//     .filter((order) => {
//       const matchesSearch =
//         order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         order.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         order.customerName.toLowerCase().includes(searchQuery.toLowerCase())

//       const matchesStatus = statusFilter ? order.status === statusFilter : true

//       return matchesSearch && matchesStatus
//     })
//     .sort((a, b) => {
//       if (sortDirection === "asc") {
//         return a.createdAt.getTime() - b.createdAt.getTime()
//       } else {
//         return b.createdAt.getTime() - a.createdAt.getTime()
//       }
//     })

//   // Get status badge
//   const getStatusBadge = (status: Order["status"]) => {
//     switch (status) {
//       case "pending":
//         return <Badge className="bg-yellow-500">Pending</Badge>
//       case "preparing":
//         return <Badge className="bg-blue-500">Preparing</Badge>
//       case "ready":
//         return <Badge className="bg-green-500">Ready</Badge>
//       case "completed":
//         return <Badge className="bg-purple-500">Completed</Badge>
//       case "cancelled":
//         return <Badge className="bg-red-500">Cancelled</Badge>
//     }
//   }

//   // Format date
//   const formatDate = (date: Date) => {
//     return date.toLocaleTimeString("en-US", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     })
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold text-gray-900">Order List</h1>
//           <Link href="/">
//             <Button className="bg-purple-600 hover:bg-purple-700">Back to POS</Button>
//           </Link>
//         </div>

//         <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
//           <div className="flex flex-col md:flex-row gap-4 mb-6">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
//               <Input
//                 type="text"
//                 placeholder="Search by order ID, table, or customer..."
//                 className="pl-10 pr-4 py-2 w-full"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//             </div>

//             <div className="flex gap-2">
//               <Button
//                 variant="outline"
//                 className="flex items-center gap-1"
//                 onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
//               >
//                 <Filter size={16} />
//                 Sort by Time
//                 {sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
//               </Button>

//               <div className="relative">
//                 <Button variant="outline" className="flex items-center gap-1" onClick={() => setStatusFilter(null)}>
//                   {statusFilter ? `Status: ${statusFilter}` : "All Statuses"}
//                   <ChevronDown size={16} />
//                 </Button>

//                 <div className="absolute top-full right-0 mt-1 bg-white border rounded-md shadow-md z-10 w-40">
//                   <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setStatusFilter(null)}>
//                     All Statuses
//                   </div>
//                   <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setStatusFilter("pending")}>
//                     Pending
//                   </div>
//                   <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setStatusFilter("preparing")}>
//                     Preparing
//                   </div>
//                   <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setStatusFilter("ready")}>
//                     Ready
//                   </div>
//                   <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setStatusFilter("completed")}>
//                     Completed
//                   </div>
//                   <div className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => setStatusFilter("cancelled")}>
//                     Cancelled
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <Tabs defaultValue="all">
//             <TabsList className="mb-4">
//               <TabsTrigger value="all">All Orders</TabsTrigger>
//               <TabsTrigger value="active">Active Orders</TabsTrigger>
//               <TabsTrigger value="completed">Completed</TabsTrigger>
//               <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
//             </TabsList>

//             <TabsContent value="all">
//               <div className="space-y-4">
//                 {filteredOrders.length === 0 ? (
//                   <div className="text-center py-8 text-gray-500">No orders found</div>
//                 ) : (
//                   filteredOrders.map((order) => (
//                     <Card key={order.id} className="p-4">
//                       <div className="flex flex-col md:flex-row justify-between">
//                         <div>
//                           <div className="flex items-center gap-2 mb-2">
//                             <h3 className="font-bold text-lg">{order.id}</h3>
//                             {getStatusBadge(order.status)}
//                           </div>
//                           <p className="text-gray-600 mb-1">Table: {order.tableNumber}</p>
//                           <p className="text-gray-600 mb-1">Customer: {order.customerName}</p>
//                           <p className="text-gray-600 mb-1">Time: {formatDate(order.createdAt)}</p>
//                         </div>

//                         <div className="mt-4 md:mt-0">
//                           <p className="font-bold text-lg mb-2">Rp {order.total.toLocaleString()}</p>
//                           <div className="flex gap-2">
//                             <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
//                               View Details
//                             </Button>
//                             {order.status === "pending" && (
//                               <Button size="sm" className="bg-green-600 hover:bg-green-700">
//                                 Accept
//                               </Button>
//                             )}
//                             {order.status === "preparing" && (
//                               <Button size="sm" className="bg-green-600 hover:bg-green-700">
//                                 Mark Ready
//                               </Button>
//                             )}
//                             {order.status === "ready" && (
//                               <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
//                                 Complete
//                               </Button>
//                             )}
//                           </div>
//                         </div>
//                       </div>

//                       <div className="mt-4 border-t pt-2">
//                         <p className="font-medium mb-2">Items:</p>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                           {order.items.map((item, index) => (
//                             <div key={index} className="flex justify-between">
//                               <p>
//                                 {item.name} x{item.quantity}
//                               </p>
//                               <p>Rp {(item.price * item.quantity).toLocaleString()}</p>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     </Card>
//                   ))
//                 )}
//               </div>
//             </TabsContent>

//             <TabsContent value="active">
//               <div className="space-y-4">
//                 {filteredOrders.filter((order) => ["pending", "preparing", "ready"].includes(order.status)).length ===
//                 0 ? (
//                   <div className="text-center py-8 text-gray-500">No active orders found</div>
//                 ) : (
//                   filteredOrders
//                     .filter((order) => ["pending", "preparing", "ready"].includes(order.status))
//                     .map((order) => (
//                       <Card key={order.id} className="p-4">
//                         <div className="flex flex-col md:flex-row justify-between">
//                           <div>
//                             <div className="flex items-center gap-2 mb-2">
//                               <h3 className="font-bold text-lg">{order.id}</h3>
//                               {getStatusBadge(order.status)}
//                             </div>
//                             <p className="text-gray-600 mb-1">Table: {order.tableNumber}</p>
//                             <p className="text-gray-600 mb-1">Customer: {order.customerName}</p>
//                             <p className="text-gray-600 mb-1">Time: {formatDate(order.createdAt)}</p>
//                           </div>

//                           <div className="mt-4 md:mt-0">
//                             <p className="font-bold text-lg mb-2">Rp {order.total.toLocaleString()}</p>
//                             <div className="flex gap-2">
//                               <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
//                                 View Details
//                               </Button>
//                               {order.status === "pending" && (
//                                 <Button size="sm" className="bg-green-600 hover:bg-green-700">
//                                   Accept
//                                 </Button>
//                               )}
//                               {order.status === "preparing" && (
//                                 <Button size="sm" className="bg-green-600 hover:bg-green-700">
//                                   Mark Ready
//                                 </Button>
//                               )}
//                               {order.status === "ready" && (
//                                 <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
//                                   Complete
//                                 </Button>
//                               )}
//                             </div>
//                           </div>
//                         </div>

//                         <div className="mt-4 border-t pt-2">
//                           <p className="font-medium mb-2">Items:</p>
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                             {order.items.map((item, index) => (
//                               <div key={index} className="flex justify-between">
//                                 <p>
//                                   {item.name} x{item.quantity}
//                                 </p>
//                                 <p>Rp {(item.price * item.quantity).toLocaleString()}</p>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </Card>
//                     ))
//                 )}
//               </div>
//             </TabsContent>

//             <TabsContent value="completed">
//               <div className="space-y-4">
//                 {filteredOrders.filter((order) => order.status === "completed").length === 0 ? (
//                   <div className="text-center py-8 text-gray-500">No completed orders found</div>
//                 ) : (
//                   filteredOrders
//                     .filter((order) => order.status === "completed")
//                     .map((order) => (
//                       <Card key={order.id} className="p-4">
//                         <div className="flex flex-col md:flex-row justify-between">
//                           <div>
//                             <div className="flex items-center gap-2 mb-2">
//                               <h3 className="font-bold text-lg">{order.id}</h3>
//                               {getStatusBadge(order.status)}
//                             </div>
//                             <p className="text-gray-600 mb-1">Table: {order.tableNumber}</p>
//                             <p className="text-gray-600 mb-1">Customer: {order.customerName}</p>
//                             <p className="text-gray-600 mb-1">Time: {formatDate(order.createdAt)}</p>
//                           </div>

//                           <div className="mt-4 md:mt-0">
//                             <p className="font-bold text-lg mb-2">Rp {order.total.toLocaleString()}</p>
//                             <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
//                               View Details
//                             </Button>
//                           </div>
//                         </div>

//                         <div className="mt-4 border-t pt-2">
//                           <p className="font-medium mb-2">Items:</p>
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                             {order.items.map((item, index) => (
//                               <div key={index} className="flex justify-between">
//                                 <p>
//                                   {item.name} x{item.quantity}
//                                 </p>
//                                 <p>Rp {(item.price * item.quantity).toLocaleString()}</p>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </Card>
//                     ))
//                 )}
//               </div>
//             </TabsContent>

//             <TabsContent value="cancelled">
//               <div className="space-y-4">
//                 {filteredOrders.filter((order) => order.status === "cancelled").length === 0 ? (
//                   <div className="text-center py-8 text-gray-500">No cancelled orders found</div>
//                 ) : (
//                   filteredOrders
//                     .filter((order) => order.status === "cancelled")
//                     .map((order) => (
//                       <Card key={order.id} className="p-4">
//                         <div className="flex flex-col md:flex-row justify-between">
//                           <div>
//                             <div className="flex items-center gap-2 mb-2">
//                               <h3 className="font-bold text-lg">{order.id}</h3>
//                               {getStatusBadge(order.status)}
//                             </div>
//                             <p className="text-gray-600 mb-1">Table: {order.tableNumber}</p>
//                             <p className="text-gray-600 mb-1">Customer: {order.customerName}</p>
//                             <p className="text-gray-600 mb-1">Time: {formatDate(order.createdAt)}</p>
//                           </div>

//                           <div className="mt-4 md:mt-0">
//                             <p className="font-bold text-lg mb-2">Rp {order.total.toLocaleString()}</p>
//                             <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
//                               View Details
//                             </Button>
//                           </div>
//                         </div>

//                         <div className="mt-4 border-t pt-2">
//                           <p className="font-medium mb-2">Items:</p>
//                           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//                             {order.items.map((item, index) => (
//                               <div key={index} className="flex justify-between">
//                                 <p>
//                                   {item.name} x{item.quantity}
//                                 </p>
//                                 <p>Rp {(item.price * item.quantity).toLocaleString()}</p>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </Card>
//                     ))
//                 )}
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>
//       </div>
//     </div>
//   )
// }

