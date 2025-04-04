// "use client";
// import { useState, useEffect } from "react";
// import { doc, updateDoc } from "firebase/firestore";
// import { posDb as db } from "@/firebase/client";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";

// interface Restaurant {
//   id: string;
//   name: string;
//   isActive: boolean;
//   type?: string;
//   email?: string;
//   ownerName?: string;
//   activationToken?: string;
//   tokenExpiresAt?: string;
// }

// export default function RestaurantList() {
//   const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchRestaurants = async () => {
//       try {
//         const res = await fetch("/admin/api/restaurants");
//         if (!res.ok) {
//           throw new Error(`HTTP error! status: ${res.status}`);
//         }
//         const data = await res.json();
//         if (Array.isArray(data)) {
//           setRestaurants(data);
//         } else {
//           throw new Error("Fetched data is not an array");
//         }
//       } catch (err) {
//         const error = err as Error;
//         console.error("Error fetching restaurants:", error);
//         setError(error.message || "Failed to load restaurants");
//         setRestaurants([]);
//       }
//     };
//     fetchRestaurants();
//   }, []);

//   const toggleStatus = async (id: string, currentStatus: boolean) => {
//     try {
//       const res = await fetch(`/admin/api/restaurants/${id}/status`, {
//         method: "PATCH",
//         body: JSON.stringify({ isActive: !currentStatus }),
//         headers: { "Content-Type": "application/json" },
//       });
//       if (res.ok) {
//         setRestaurants(
//           restaurants.map((r: Restaurant) =>
//             r.id === id ? { ...r, isActive: !currentStatus } : r
//           )
//         );
//       } else {
//         console.error("Failed to toggle status:", res.status);
//       }
//     } catch (err) {
//       console.error("Error toggling status:", err);
//     }
//   };

//   const renewToken = async (id: string) => {
//     try {
//       const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
//       const now = new Date();
//       const newExpiresAt = new Date(now);
//       newExpiresAt.setDate(now.getDate() + 30); // Renew for 30 more days

//       // Update Firestore
//       const restaurantRef = doc(db, "restaurants", id);
//       await updateDoc(restaurantRef, {
//         activationToken: newToken,
//         tokenExpiresAt: newExpiresAt.toISOString(),
//         lastUpdated: new Date().toISOString(),
//       });

//       // Update local state
//       setRestaurants(
//         restaurants.map((r: Restaurant) =>
//           r.id === id
//             ? {
//                 ...r,
//                 activationToken: newToken,
//                 tokenExpiresAt: newExpiresAt.toISOString(),
//               }
//             : r
//         )
//       );
//       alert(`New token: ${newToken} - Share this with the restaurant owner.`);
//     } catch (err) {
//       console.error("Error renewing token:", err);
//     }
//   };

//   const getTokenStatus = (expiresAt?: string) => {
//     if (!expiresAt) return { status: "No token", variant: "outline" };
//     const expirationDate = new Date(expiresAt);
//     const now = new Date();
//     const daysUntilExpiration = Math.ceil(
//       (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
//     );

//     if (daysUntilExpiration <= 0) {
//       return { status: "Expired", variant: "destructive" };
//     } else if (daysUntilExpiration <= 7) {
//       return { status: `Expiring in ${daysUntilExpiration} days`, variant: "secondary" };
//     } else {
//       return { status: "Active", variant: "outline" };
//     }
//   };

//   if (error) return <div>Error: {error}</div>;
//   if (restaurants.length === 0) return <div>Loading restaurants...</div>;

//   return (
//     <div>
//       {restaurants.map((restaurant: Restaurant) => {
//         const tokenStatus = getTokenStatus(restaurant.tokenExpiresAt);
//         return (
//           <div key={restaurant.id} className="flex items-center space-x-4 mb-4">
//             <h3 className="w-1/3">{restaurant.name}</h3>
//             <Badge variant={tokenStatus.variant as any}>
//               {tokenStatus.status}
//             </Badge>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => toggleStatus(restaurant.id, restaurant.isActive)}
//             >
//               {restaurant.isActive ? "Deactivate" : "Activate"}
//             </Button>
//             {tokenStatus.status === "Expired" && (
//               <Button
//                 variant="secondary"
//                 size="sm"
//                 onClick={() => renewToken(restaurant.id)}
//               >
//                 Renew Token
//               </Button>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// }