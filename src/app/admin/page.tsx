import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Dashboard from '../dashboard';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (session?.role === 'customer') redirect('/account');
  if (!session || session.role !== 'admin') redirect('/admin/login');
  return <Dashboard user={{ name: session.name, email: session.email }} />;
}
