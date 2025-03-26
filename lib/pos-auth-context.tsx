// "use client"

// import { useState, useEffect } from "react"
// import { onAuthStateChanged, User } from "firebase/auth"
// import { doc, getDoc } from "firebase/firestore"
// import { secondaryAuth, db } from "@/lib/firebase"
// import { PosAuthContextType, PosAuthContext } from "./pos-auth-context"

// export function PosAuthProvider({ children }: { children: React.ReactNode }) {
//   const [authState, setAuthState] = useState<PosAuthContextType>({
//     isAuthenticated: false,
//     userId: null,
//     user: null,
//     loading: true,
//   })

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(secondaryAuth, async (user) => {
//       console.log("POS Auth State Changed:", { uid: user?.uid, email: user?.email })
//       if (user) {
//         try {
//           // Force token refresh to ensure it's available for Firestore
//           await user.getIdToken(true)
//           console.log("Token refreshed for UID:", user.uid)

//           const restaurantDocRef = doc(db, "restaurants", user.uid)
//           console.log("Fetching restaurant doc for UID:", user.uid)
//           const restaurantDoc = await getDoc(restaurantDocRef)
//           if (!restaurantDoc.exists()) {
//             console.error(`Restaurant document not found for UID: ${user.uid}`)
//             setAuthState({ isAuthenticated: false, userId: null, user: null, loading: false })
//             return
//           }
//           setAuthState({
//             isAuthenticated: true,
//             userId: user.uid,
//             user,
//             loading: false,
//           })
//         } catch (error) {
//           console.error("Error fetching POS user:", error)
//           setAuthState({ isAuthenticated: false, userId: null, user: null, loading: false })
//         }
//       } else {
//         setAuthState({ isAuthenticated: false, userId: null, user: null, loading: false })
//       }
//     })
//     return () => unsubscribe()
//   }, [])

//   return (
//     <PosAuthContext.Provider value={authState}>
//       {children}
//     </PosAuthContext.Provider>
//   )
// }