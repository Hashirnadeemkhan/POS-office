// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { signInWithEmailAndPassword, getAuth } from "firebase/auth"  // Added getAuth
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Label } from "@/components/ui/label"
// import { toast } from "sonner"  
// import { ShieldCheck } from 'lucide-react'

// // Update firebase import to include auth
// // @/lib/firebase.js
// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";


// const firebaseConfig = {
//   apiKey: "AIzaSyDtZ_EHQhGSTnJZ2mGAEDC5gK6UjAEFWr8",
//   authDomain: "pos-office-96be6.firebaseapp.com",
//   projectId: "pos-office-96be6",
//   storageBucket: "pos-office-96be6.firebasestorage.app",
//   messagingSenderId: "696435013554",
//   appId: "1:696435013554:web:ca194a39d2bbec424096ab",
//   measurementId: "G-KKB494W3VT",
// };

// const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app);
// export const auth = getAuth(app);  // Add this export
// export { app };

// export default function LoginPage() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [loading, setLoading] = useState(false)
//   const router = useRouter()

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)

//     try {
//       await signInWithEmailAndPassword(auth, email, password)
//       toast.success("Login successful", {
//         description: "Welcome to iPOS Admin Panel",
//       })
//       router.push("/dashboard")
//     } catch (error) {
//       toast.error("Login failed", {
//         description: "Invalid email or password",
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-50">
//       <Card className="w-full max-w-md">
//         <CardHeader className="space-y-1">
//           <div className="flex justify-center mb-4">
//             <div className="bg-primary/10 p-3 rounded-full">
//               <ShieldCheck className="h-8 w-8 text-primary" />
//             </div>
//           </div>
//           <CardTitle className="text-2xl text-center">iPOS Admin Panel</CardTitle>
//           <CardDescription className="text-center">Enter your credentials to access the admin panel</CardDescription>
//         </CardHeader>
//         <form onSubmit={handleLogin}>
//           <CardContent className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="admin@example.com"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="password">Password</Label>
//               <Input
//                 id="password"
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//               />
//             </div>
//           </CardContent>
//           <CardFooter>
//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading ? "Logging in..." : "Login"}
//             </Button>
//           </CardFooter>
//         </form>
//       </Card>
//     </div>
//   )
// }