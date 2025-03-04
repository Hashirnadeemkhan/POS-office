// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Toaster } from "@/components/ui/sonner"

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <head />
//       <body>
//         <main>{children}</main>
//         <Toaster />
//       </body>
//     </html>
//   )
// }


// export default function SettingsPage() {
//   const [loading, setLoading] = useState(false)

//   const handleSaveProfile = () => {
//     setLoading(true)

//     // Simulate API call
//     setTimeout(() => {
//       setLoading(false)
//       toast({
//         title: "Profile updated",
//         description: "Your profile has been updated successfully.",
//       })
//     }, 1000)
//   }

//   const handleChangePassword = () => {
//     setLoading(true)

//     // Simulate API call
//     setTimeout(() => {
//       setLoading(false)
//       toast({
//         title: "Password changed",
//         description: "Your password has been changed successfully.",
//       })
//     }, 1000)
//   }

//   return (
//     <div className="space-y-6">
//       <h1 className="text-3xl font-bold">Settings</h1>

//       <Tabs defaultValue="profile" className="w-full">
//         <TabsList className="grid w-full max-w-md grid-cols-2">
//           <TabsTrigger value="profile">Profile</TabsTrigger>
//           <TabsTrigger value="password">Password</TabsTrigger>
//         </TabsList>

//         <TabsContent value="profile">
//           <Card>
//             <CardHeader>
//               <CardTitle>Profile</CardTitle>
//               <CardDescription>Update your personal information.</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="name">Name</Label>
//                 <Input id="name" placeholder="Your name" defaultValue="Admin User" />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="email">Email</Label>
//                 <Input id="email" type="email" placeholder="Your email" defaultValue="admin@example.com" />
//               </div>
//             </CardContent>
//             <CardFooter>
//               <Button onClick={handleSaveProfile} disabled={loading}>
//                 {loading ? "Saving..." : "Save changes"}
//               </Button>
//             </CardFooter>
//           </Card>
//         </TabsContent>

//         <TabsContent value="password">
//           <Card>
//             <CardHeader>
//               <CardTitle>Password</CardTitle>
//               <CardDescription>Change your password.</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="current-password">Current password</Label>
//                 <Input id="current-password" type="password" />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="new-password">New password</Label>
//                 <Input id="new-password" type="password" />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="confirm-password">Confirm password</Label>
//                 <Input id="confirm-password" type="password" />
//               </div>
//             </CardContent>
//             <CardFooter>
//               <Button onClick={handleChangePassword} disabled={loading}>
//                 {loading ? "Changing..." : "Change password"}
//               </Button>
//             </CardFooter>
//           </Card>
//         </TabsContent>
//       </Tabs>

//       <Toaster />
//     </div>
//   )
// }

