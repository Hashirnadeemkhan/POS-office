// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize the primary Firebase app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app)
const auth = getAuth(app)

// Initialize a secondary Firebase app for admin creation
const secondaryApp = initializeApp(firebaseConfig, "secondary")
const secondaryAuth = getAuth(secondaryApp)

export { app, db, auth, secondaryApp, secondaryAuth }
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


