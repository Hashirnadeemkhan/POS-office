// import { type NextRequest, NextResponse } from "next/server"
// import { getOrderById } from "@/lib/firebase"

// export async function POST(request: NextRequest) {
//   try {
//     const { orderId } = await request.json()

//     if (!orderId) {
//       return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
//     }

//     const order = await getOrderById(orderId)

//     if (!order) {
//       return NextResponse.json({ error: "Order not found" }, { status: 404 })
//     }

//     // Return the order data to be used for PDF generation on the client
//     return NextResponse.json({ order })
//   } catch (error) {
//     console.error("Error generating receipt:", error)
//     return NextResponse.json({ error: "Failed to generate receipt" }, { status: 500 })
//   }
// }

