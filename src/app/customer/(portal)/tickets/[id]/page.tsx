import { CustomerTicketDetail } from '@/components/customer/CustomerTicketDetail';

interface Props {
  params: { id: string };
}

export default function CustomerTicketDetailPage({ params }: Props) {
  return <CustomerTicketDetail ticketId={parseInt(params.id, 10)} />;
}
