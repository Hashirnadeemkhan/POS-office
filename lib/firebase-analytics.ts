// @/lib/firebase-analytics.js
"use client"; // Mark this file as client-side only

import { useEffect } from "react";
import { getAnalytics, isSupported } from "firebase/analytics";
import { app } from "./firebase"; // Import the app instance

export function useFirebaseAnalytics() {
  useEffect(() => {
    // This code only runs in the browser due to useEffect
    isSupported().then((supported) => {
      if (supported) {
        const analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized");
      } else {
        console.log("Firebase Analytics not supported in this environment");
      }
    }).catch((error) => {
      console.error("Error initializing Firebase Analytics:", error);
    });
  }, []); // Empty dependency array ensures it runs once on mount
}