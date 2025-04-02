"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function NotFound() {
  // This effect will apply styles directly to the body and html elements
  useEffect(() => {
    // Save original styles
    const originalOverflow = document.body.style.overflow
    const originalHeight = document.documentElement.style.height

    // Apply full height to html and body
    document.documentElement.style.height = "100%"
    document.body.style.height = "100%"
    document.body.style.overflow = "hidden"

    // Cleanup function to restore original styles
    return () => {
      document.body.style.overflow = originalOverflow
      document.documentElement.style.height = originalHeight
    }
  }, [])

  return (
    <>
      {/* This div will completely replace the content */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
          zIndex: 9999,
        }}
      >
        <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-6xl font-extrabold text-purple-600">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mt-4">Page Not Found</h2>
          <p className="text-gray-600 mt-2">Oops! The page you are looking for does not exist.</p>
          <Link
            className="mt-6 inline-block px-6 py-3 bg-purple-600 text-white text-lg font-medium rounded-lg shadow-md hover:bg-purple-700 transition-all"
            href="/"
          >
            Return Home
          </Link>
        </div>
      </div>
    </>
  )
}

