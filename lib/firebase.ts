// @/lib/firebase.js (or wherever your Firebase config is)
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore and export it
export const db = getFirestore(app);

// Optionally export app and analytics if needed elsewhere
export { app, analytics };