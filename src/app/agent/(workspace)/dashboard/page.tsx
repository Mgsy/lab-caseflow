import type { Metadata } from 'next';
import { TicketListView } from '@/components/agent/TicketListView';

export const metadata: Metadata = {
  title: 'Tickets — Caseflow',
};

export default function DashboardPage() {
  return <TicketListView />;
}
