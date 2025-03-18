'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function DashboardPage() {
  const router = useRouter();
  const [isValidSession, setIsValidSession] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/admin/login');
        return;
      }

      // Verify session token
      const storedToken = localStorage.getItem('sessionToken');
      const sessionRef = doc(db, 'activeSessions', user.uid);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists() && sessionSnap.data()?.sessionToken === storedToken) {
        setIsValidSession(true);
      } else {
        localStorage.removeItem('sessionToken');
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/admin/logout', { method: 'POST' });
    localStorage.removeItem('sessionToken');
    router.push('/admin/login');
  };

  if (!isValidSession) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Admin Dashboard</h1>
        <p className="text-gray-600 mb-6">Welcome to the POS Admin Panel</p>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}