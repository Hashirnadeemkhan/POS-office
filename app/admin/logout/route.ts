import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST() {
  try {
    const user = auth.currentUser;
    if (user) {
      await deleteDoc(doc(db, 'activeSessions', user.uid));
    }
    await signOut(auth);
    return NextResponse.json({ message: 'Logout successful' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}