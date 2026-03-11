'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCsrfToken } from '@/lib/csrf';

interface Ticket {
  id: number;
  subject: string;
  status: 'new' | 'open' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CustomerTicketList() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customer/tickets', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tickets) setTickets(data.tickets);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your Tickets</h1>
          <p className="page-subtitle">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/customer/tickets/new" className="btn-primary">
          + New Ticket
        </Link>
      </div>

      <div className="ticket-table-wrap">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <p>No tickets yet.</p>
            <p className="mt-2">
              <Link href="/customer/tickets/new" className="btn-primary">
                Submit your first ticket
              </Link>
            </p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Subject</th>
                <th>Created</th>
                <th>Last reply</th>
                <th>Messages</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="ticket-row"
                  onClick={() => router.push(`/customer/tickets/${ticket.id}`)}
                >
                  <td>
                    <span className={`status-badge status-${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="ticket-subject">{ticket.subject}</td>
                  <td className="ticket-time">{formatDate(ticket.createdAt)}</td>
                  <td className="ticket-time">
                    {relativeTime(ticket.lastMessageAt || ticket.updatedAt)}
                  </td>
                  <td className="ticket-count">{ticket.messageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
