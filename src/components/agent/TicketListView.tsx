'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/csrf';

const POLL_INTERVAL = 5000;

interface Ticket {
  id: number;
  subject: string;
  status: 'new' | 'open' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  customer: { id: number; firstName: string; lastName: string; email: string };
  assignedAgent: { id: number; firstName: string; lastName: string; nickname?: string } | null;
  tags: string[];
  messageCount: number;
  lastMessageAt: string | null;
}

interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  nickname?: string;
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

const STATUS_DOT: Record<string, string> = {
  new: 'status-dot-new',
  open: 'status-dot-open',
  closed: 'status-dot-closed',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  normal: '',
  high: 'High',
  urgent: 'Urgent',
};

export function TicketListView() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicketIds, setNewTicketIds] = useState<Set<number>>(new Set());

  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'open' | 'closed'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Keep a stable ref to current ticket IDs for polling comparison
  const knownIdsRef = useRef<Set<number>>(new Set());

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (assigneeFilter !== 'all') params.set('assignee', assigneeFilter);
    if (search) params.set('search', search);
    return params;
  }, [statusFilter, assigneeFilter, search]);

  const fetchTickets = useCallback(async () => {
    const res = await fetch(`/api/agent/tickets?${buildParams().toString()}`, {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    });
    if (res.ok) {
      const data = await res.json();
      setTickets(data.tickets);
      knownIdsRef.current = new Set((data.tickets as Ticket[]).map((t) => t.id));
    }
    setLoading(false);
  }, [buildParams]);

  // Initial fetch + re-fetch when filters change
  useEffect(() => {
    setLoading(true);
    setNewTicketIds(new Set());
    fetchTickets();
  }, [fetchTickets]);

  // Polling: every 5s, re-fetch with current filters and surface new tickets
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/agent/tickets?${buildParams().toString()}`, {
        headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
      });
      if (!res.ok) return;
      const data = await res.json();
      const fetched: Ticket[] = data.tickets;

      const incoming = fetched.filter((t) => !knownIdsRef.current.has(t.id));
      if (incoming.length > 0) {
        const incomingIds = new Set(incoming.map((t) => t.id));
        // Prepend new tickets so they appear at the top
        setTickets((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const truly_new = incoming.filter((t) => !existingIds.has(t.id));
          return truly_new.length > 0 ? [...truly_new, ...prev] : prev;
        });
        knownIdsRef.current = new Set(fetched.map((t) => t.id));
        setNewTicketIds(incomingIds);
        // Clear highlight after animation completes
        setTimeout(() => {
          setNewTicketIds((prev) => {
            const next = new Set(prev);
            incomingIds.forEach((id) => next.delete(id));
            return next;
          });
        }, 2000);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [buildParams]);

  useEffect(() => {
    fetch('/api/agent/users', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((d) => setAgents(d.users || []));
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {(['all', 'new', 'open', 'closed'] as const).map((s) => (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="filter-controls">
          <select
            className="form-select-sm"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value as typeof assigneeFilter)}
          >
            <option value="all">All assignees</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              type="text"
              className="form-input-sm"
              placeholder="Search tickets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
              >
                ×
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Ticket table */}
      <div className="ticket-table-wrap">
        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-row" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">No tickets match the current filters.</div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Assigned</th>
                <th>Priority</th>
                <th>Tags</th>
                <th>Messages</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className={`ticket-row${newTicketIds.has(ticket.id) ? ' ticket-row-new' : ''}`}
                  onClick={() => router.push(`/agent/tickets/${ticket.id}`)}
                >
                  <td>
                    <span className={`status-dot ${STATUS_DOT[ticket.status]}`} />
                  </td>
                  <td className="ticket-subject">{ticket.subject}</td>
                  <td className="ticket-customer">
                    {ticket.customer.firstName} {ticket.customer.lastName}
                  </td>
                  <td className="ticket-assignee">
                    {ticket.assignedAgent ? (
                      <span>
                        {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}
                      </span>
                    ) : (
                      <span className="muted-text">Unassigned</span>
                    )}
                  </td>
                  <td>
                    {ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                      <span className={`priority-badge priority-${ticket.priority}`}>
                        {PRIORITY_LABEL[ticket.priority]}
                      </span>
                    ) : ticket.priority === 'low' ? (
                      <span className="muted-text text-xs">Low</span>
                    ) : null}
                  </td>
                  <td>
                    <div className="tags-row">
                      {ticket.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="tag-pill">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="ticket-count">{ticket.messageCount}</td>
                  <td className="ticket-time">
                    {relativeTime(ticket.lastMessageAt || ticket.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
