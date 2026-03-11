import type { Metadata } from 'next';
import { CreateTicketForm } from '@/components/customer/CreateTicketForm';

export const metadata: Metadata = {
  title: 'New Ticket — Caseflow',
};

export default function NewTicketPage() {
  return <CreateTicketForm />;
}
