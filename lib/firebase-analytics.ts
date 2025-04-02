// @/lib/firebase-analytics.ts
"use client";

import { useEffect } from "react";
import { getAnalytics, isSupported } from "firebase/analytics";
import { posApp as app } from "@/firebase/client"; // Fix: Import posApp from client config

export function useFirebaseAnalytics() {
  useEffect(() => {
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
  }, []);
}