import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth';
import { AdminUsersView } from '@/components/agent/AdminUsersView';

export const metadata: Metadata = {
  title: 'Users — Caseflow',
};

export default async function AdminUsersPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect('/agent/dashboard');
  }

  return <AdminUsersView />;
}
