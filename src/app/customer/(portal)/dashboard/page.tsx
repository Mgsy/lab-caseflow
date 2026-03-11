import type { Metadata } from 'next';
import { CustomerTicketList } from '@/components/customer/CustomerTicketList';

export const metadata: Metadata = {
  title: 'My Tickets — Caseflow',
};

export default function CustomerDashboardPage() {
  return <CustomerTicketList />;
}
