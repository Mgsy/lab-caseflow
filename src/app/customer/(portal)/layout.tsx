import { redirect } from 'next/navigation';
import { requireCustomerSession } from '@/lib/auth';
import { CustomerNav } from '@/components/customer/CustomerNav';

export default async function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomerSession();
  if (!session) {
    redirect('/customer/login');
  }

  return (
    <div className="customer-shell">
      <CustomerNav />
      <main className="customer-main">{children}</main>
    </div>
  );
}
