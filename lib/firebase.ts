
import { getFirestore } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import {  collection, doc, getDoc, query, orderBy, getDocs } from "firebase/firestore"
import { getStorage } from "firebase/storage";
import type { Order } from "./type";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const auth = getAuth(app)
export const storage = getStorage(app);

export { db, auth, app }

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const orderRef = doc(db, "orders", orderId)
    const orderSnap = await getDoc(orderRef)

    if (!orderSnap.exists()) {
      return null
    }

    return {
      id: orderSnap.id,
      ...orderSnap.data(),
    } as Order
  } catch (error) {
    console.error("Error fetching order:", error)
    return null
  }
}

// // Get recent orders
// export async function getRecentOrders(limit = 10): Promise<Order[]> {
//   try {
//     const ordersRef = collection(db, "orders")
//     const q = query(ordersRef, orderBy("createdAt", "desc"), limit)
//     const querySnapshot = await getDocs(q)

//     const orders: Order[] = []
//     querySnapshot.forEach((doc) => {
//       orders.push({
//         id: doc.id,
//         ...doc.data(),
//       } as Order)
//     })

//     return orders
//   } catch (error) {
//     console.error("Error fetching recent orders:", error)
//     return []
//   }
// }


