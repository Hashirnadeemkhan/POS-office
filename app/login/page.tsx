"use client";

import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CiCircleRemove, CiSquareRemove } from "react-icons/ci";
import Image from "next/image";
import { useRouter } from "next/navigation";

const pinSchema = z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN cannot exceed 6 digits");

export default function LoginPage() {
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const router = useRouter();
  const CORRECT_PIN = "123456"; // Change this to your actual PIN

  const slides = [
    {
      title: "Grow your business.",
      description: "POS improve your business by enhance your guest experience and restaurant business operations",
      image: "/login1.jpg",
    },
    {
      title: "Track your sales.",
      description: "Monitor your sales performance in real-time with detailed analytics and reports",
      image: "/login2.webp",
    },
    {
      title: "Manage inventory.",
      description: "Keep track of your stock levels and get alerts when items are running low",
      image: "/login3.png",
    },
  ];

  const handleNumberClick = (num: number) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const handleSignIn = async () => {
    try {
      console.log("Validating PIN...");
      pinSchema.parse(pin);

      console.log("Setting loading state to true...");
      setLoading(true);

      console.log("Simulating delay...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Checking PIN...");
      if (pin === CORRECT_PIN) {
        console.log("Login successful!");
        setPin("");
        router.push('/');
      } else {
        console.log("Invalid PIN.");
        setError("Invalid PIN. Please try again.");
      }
    } catch (err) {
      console.error("Error during sign-in:", err);
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      console.log("Setting loading state to false...");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 bg-white p-8 flex flex-col justify-center items-center">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8 relative w-64 h-64 mx-auto">
            <Image
              src={slides[currentSlide].image || "/placeholder.svg"}
              alt="POS System"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{slides[currentSlide].title}</h1>
          <p className="text-gray-600 mb-8">{slides[currentSlide].description}</p>
          <div className="flex justify-center space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  "w-8 h-2 rounded-full transition-colors",
                  currentSlide === index ? "bg-blue-500" : "bg-gray-300"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 bg-gray-50 p-8 flex flex-col justify-center items-center">
        <Card className="w-full max-w-md p-8 shadow-sm">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
                <path d="M20 14v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
                <path d="M12 12a2 2 0 0 0 0 4 2 2 0 0 0 0-4Z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-2">Enter Pin</h2>
          <p className="text-gray-500 text-center mb-6">Your Pin is required to enable Touch ID</p>

          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={cn("w-3 h-3 rounded-full", i < pin.length ? "bg-blue-500" : "bg-gray-300")} />
              ))}
            </div>
          </div>

          {error && <div className="text-red-500 text-center mb-4 text-sm">{error}</div>}

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-14 text-xl font-medium rounded-full"
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </Button>
            ))}
            <Button variant="outline" className="h-14 rounded-full" onClick={handleClear}>
              <CiCircleRemove className="h-6 w-6 font-semibold " />
            </Button>
            <Button
              variant="outline"
              className="h-14 text-xl font-medium rounded-full"
              onClick={() => handleNumberClick(0)}
            >
              0
            </Button>
            <Button variant="outline" className="h-14 rounded-full" onClick={handleBackspace}>
              <CiSquareRemove className="h-6 w-6" />
            </Button>
          </div>

          <Button className="w-full h-12 text-base" disabled={pin.length < 4 || loading} onClick={handleSignIn}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </Card>
      </div>
    </div>
  );
}