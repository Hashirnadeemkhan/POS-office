// @/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtZ_EHQhGSTnJZ2mGAEDC5gK6UjAEFWr8",
  authDomain: "pos-office-96be6.firebaseapp.com",
  projectId: "pos-office-96be6",
  storageBucket: "pos-office-96be6.firebasestorage.app",
  messagingSenderId: "696435013554",
  appId: "1:696435013554:web:ca194a39d2bbec424096ab",
  measurementId: "G-KKB494W3VT",
};

// Initialize Firebase app (safe for both server and client)
const app = initializeApp(firebaseConfig);

// Initialize Firestore (safe for both server and client)
export const db = getFirestore(app);

// Initialize Analytics only on the client side
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Export app and analytics for use elsewhere if needed
export { app, analytics };