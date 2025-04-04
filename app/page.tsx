import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/pos/login'); // Redirect to /admin/login
  return null;
}
