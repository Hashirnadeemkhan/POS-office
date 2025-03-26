// "use client";

// import { createContext, useContext, useState, useEffect, ReactNode } from "react";
// import { onAuthStateChanged, User, getIdToken } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { auth, db } from "@/lib/firebase";

// interface AdminAuthContextType {
//   isAuthenticated: boolean;
//   userRole: "admin" | "superadmin" | null;
//   userId: string | null;
//   user: User | null;
//   loading: boolean;
//   getIdToken: () => Promise<string>;
// }

// const AdminAuthContext = createContext<AdminAuthContextType>({
//   isAuthenticated: false,
//   userRole: null,
//   userId: null,
//   user: null,
//   loading: true,
//   getIdToken: () => Promise.reject("Admin auth context not initialized"),
// });

// export const useAdminAuth = () => useContext(AdminAuthContext);

// export function AdminAuthProvider({ children }: { children: ReactNode }) {
//   const [authState, setAuthState] = useState<Omit<AdminAuthContextType, "getIdToken">>({
//     isAuthenticated: false,
//     userRole: null,
//     userId: null,
//     user: null,
//     loading: true,
//   });

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         try {
//           const userDocRef = doc(db, "adminUsers", user.uid);
//           const userDoc = await getDoc(userDocRef);
//           const role = userDoc.exists() ? userDoc.data().role : null;

//           setAuthState({
//             isAuthenticated: true,
//             userRole: role,
//             userId: user.uid,
//             user,
//             loading: false,
//           });
//         } catch (error) {
//           console.error("Error fetching admin user role:", error);
//           setAuthState({
//             isAuthenticated: false,
//             userRole: null,
//             userId: null,
//             user: null,
//             loading: false,
//           });
//         }
//       } else {
//         setAuthState({
//           isAuthenticated: false,
//           userRole: null,
//           userId: null,
//           user: null,
//           loading: false,
//         });
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const getIdToken = async (): Promise<string> => {
//     if (!authState.user) throw new Error("No authenticated admin user");
//     return await getIdToken(authState.user);
//   };

//   return (
//     <AdminAuthContext.Provider value={{ ...authState, getIdToken }}>
//       {children}
//     </AdminAuthContext.Provider>
//   );
// }