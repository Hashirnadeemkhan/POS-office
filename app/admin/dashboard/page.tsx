"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import RestaurantsTable from "@/src/components/RestaurantsTable"
import { Building2, Users, UserMinus } from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    deactive: 0,
    loading: true,
  })
  const [userName, setUserName] = useState("Admin") // Default value

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminRef = doc(db, "adminUsers", user.uid);
        const restaurantRef = doc(db, "restaurants", user.uid);
  
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
          const adminData = adminSnap.data();
          const name = adminData.name || "Admin";
          setUserName(name);
          localStorage.setItem("userName", name); // Use name directly
        } else {
          const restaurantSnap = await getDoc(restaurantRef);
          if (restaurantSnap.exists()) {
            const restaurantData = restaurantSnap.data();
            const name = restaurantData.name || restaurantData.ownerName || "Restaurant User";
            setUserName(name);
            localStorage.setItem("userName", name); // Use name directly
          } else {
            setUserName("Unknown User");
            localStorage.setItem("userName", "Unknown User"); // Use value directly
          }
        }
      } else {
        setUserName("Admin");
        localStorage.removeItem("userName");
      }
    });
  
    const restaurantsRef = collection(db, "restaurants");
    const q = query(restaurantsRef, orderBy("createdAt", "desc"));
  
    const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
      let totalCount = 0;
      let activeCount = 0;
      let deactiveCount = 0;
  
      querySnapshot.forEach((doc) => {
        totalCount++;
        if (doc.data().isActive) {
          activeCount++;
        } else {
          deactiveCount++;
        }
      });
  
      setStats({
        total: totalCount,
        active: activeCount,
        deactive: deactiveCount,
        loading: false,
      });
    }, (error) => {
      console.error("Error fetching restaurant stats in real-time:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    });
  
    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []); // No need to add userName

  // Calculate percentages for progress bars
  const activePercentage = stats.total > 0 ? (stats.active / stats.total) * 100 : 0
  const deactivePercentage = stats.total > 0 ? (stats.deactive / stats.total) * 100 : 0

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
      <div className="flex-1 p-6 mt-1">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <h1 className="text-4xl font-semibold mb-6">Hello {userName}!</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Restaurants Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Total Restaurants Accounts</p>
                <h2 className="text-3xl font-bold mt-2">
                  {stats.loading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    stats.total.toLocaleString()
                  )}
                </h2>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-emerald-50 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: stats.loading ? "0%" : "100%" }}
              ></div>
            </div>
          </div>

          {/* Active Accounts Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Active Accounts</p>
                <h2 className="text-3xl font-bold mt-2">
                  {stats.loading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    stats.active.toLocaleString()
                  )}
                </h2>
              </div>
              <div className="bg-violet-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-violet-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-violet-50 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: stats.loading ? "0%" : `${activePercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Deactivated Accounts Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">Deactive Accounts</p>
                <h2 className="text-3xl font-bold mt-2">
                  {stats.loading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    stats.deactive.toLocaleString()
                  )}
                </h2>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <UserMinus className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 h-2 bg-red-50 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: stats.loading ? "0%" : `${deactivePercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        <RestaurantsTable />
      </div>
    </div>
  )
}