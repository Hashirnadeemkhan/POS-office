// import { Suspense } from "react"
// import { notFound } from "next/navigation"
// import { getOrderById } from "@/lib/firebase"
// import ReceiptView from "@/src/components/receipt/receipt-view"
// import ReceiptSkeleton from "@/src/components/receipt/receipt-skeleton"

// export default async function ReceiptPage({
//   params,
// }: {
//   params: { orderId: string }
// }) {
//   const { orderId } = params

//   return (
//     <div className="container mx-auto py-6">
//       <Suspense fallback={<ReceiptSkeleton />}>
//         <ReceiptContent orderId={orderId} />
//       </Suspense>
//     </div>
//   )
// }

// async function ReceiptContent({ orderId }: { orderId: string }) {
//   const order = await getOrderById(orderId)

//   if (!order) {
//     notFound()
//   }

//   return <ReceiptView order={order} />
// }

