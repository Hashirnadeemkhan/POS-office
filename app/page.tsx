import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/admin/login'); // Redirect to /admin/login
  return null;
}
