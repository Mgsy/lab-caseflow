import { TicketDetailView } from '@/components/agent/TicketDetailView';

interface Props {
  params: { id: string };
}

export default function TicketDetailPage({ params }: Props) {
  return <TicketDetailView ticketId={parseInt(params.id, 10)} />;
}
