// types/index.ts
import { User } from 'firebase/auth';

export interface AppUser extends User {
  role?: 'admin' | 'superadmin';
}

export interface UserData {
  email: string;
  role: 'admin' | 'superadmin';
  createdAt: Date;
}