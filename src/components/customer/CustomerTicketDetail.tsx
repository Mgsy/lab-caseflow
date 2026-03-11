'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CaseflowEditor, CaseflowEditorHandle } from '@/components/editor/CaseflowEditor';
import { MessageRenderer } from '@/components/editor/MessageRenderer';
import { getCsrfToken, csrfHeaders } from '@/lib/csrf';

interface Sender {
  id: number;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'customer';
  avatarUrl?: string;
}

interface Message {
  id: number;
  bodyHtml: string;
  createdAt: string;
  sender: Sender;
}

interface TicketDetail {
  id: number;
  subject: string;
  status: 'new' | 'open' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

const POLL_INTERVAL = 3000;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function CustomerTicketDetail({ ticketId }: { ticketId: number }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [newMessageIds, setNewMessageIds] = useState<Set<number>>(new Set());

  const editorRef = useRef<CaseflowEditorHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string>('');

  // Fetch ticket detail
  useEffect(() => {
    fetch(`/api/customer/tickets/${ticketId}`, {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ticket) setTicket(data.ticket);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticketId]);

  // Fetch initial messages
  useEffect(() => {
    fetch(`/api/customer/tickets/${ticketId}/messages`, {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          lastTimestampRef.current = data.messages[data.messages.length - 1].createdAt;
        }
      });
  }, [ticketId]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      const after = lastTimestampRef.current;
      const url = `/api/customer/tickets/${ticketId}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`;
      const res = await fetch(url, {
        headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => [...prev, ...data.messages]);
        lastTimestampRef.current = data.messages[data.messages.length - 1].createdAt;
        setNewMessageIds(new Set(data.messages.map((m: Message) => m.id)));
        setTimeout(() => setNewMessageIds(new Set()), 2200);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [ticketId]);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!editorRef.current || editorRef.current.isEmpty()) return;
    setSendError('');
    setSending(true);

    const bodyHtml = editorRef.current.getHTML();

    try {
      const res = await fetch(`/api/customer/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ bodyHtml }),
      });

      if (!res.ok) {
        const d = await res.json();
        setSendError(d.error || 'Failed to send');
        return;
      }

      const data = await res.json();
      editorRef.current.clear();

      setMessages((prev) => [...prev, data.message]);
      lastTimestampRef.current = data.message.createdAt;
    } catch {
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">Loading ticket...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="page-container">
        <div className="empty-state">Ticket not found.</div>
      </div>
    );
  }

  const isClosed = ticket.status === 'closed';

  return (
    <div className="customer-ticket-detail">
      {/* Header */}
      <div className="customer-ticket-header">
        <Link href="/customer/dashboard" className="back-link">
          ← My Tickets
        </Link>
        <div className="customer-ticket-title-row">
          <h1 className="ticket-detail-title">{ticket.subject}</h1>
          <span className={`status-badge status-${ticket.status}`}>
            {ticket.status}
          </span>
        </div>
        <div className="muted-text text-sm">
          Opened {formatDateTime(ticket.createdAt)} &middot; Ticket #{ticket.id}
        </div>
      </div>

      {/* Conversation */}
      <div className="conversation-thread">
        {messages.length === 0 ? (
          <div className="empty-state">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const isAgent = msg.sender.role !== 'customer';
            const isNew = newMessageIds.has(msg.id);
            return (
              <div
                key={msg.id}
                className={`message-bubble ${isAgent ? 'message-agent' : 'message-customer'} ${isNew ? 'message-new' : ''}`}
              >
                <div className="message-avatar">
                  {msg.sender.avatarUrl ? (
                    <img src={msg.sender.avatarUrl} alt="" />
                  ) : (
                    <span>{initials(msg.sender.firstName, msg.sender.lastName)}</span>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-sender-name">
                      {msg.sender.firstName} {msg.sender.lastName}
                    </span>
                    <span className={`role-badge role-${msg.sender.role}`}>
                      {msg.sender.role === 'customer' ? 'You' : 'Support'}
                    </span>
                    <span className="message-time">{formatDateTime(msg.createdAt)}</span>
                  </div>
                  <div className="message-body">
                    <MessageRenderer bodyHtml={msg.bodyHtml} />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply area */}
      {isClosed ? (
        <div className="customer-ticket-closed-notice">
          This ticket is closed. If you need further assistance, please{' '}
          <a href="/customer/tickets/new">open a new ticket</a>.
        </div>
      ) : (
        <div className="reply-area">
          <CaseflowEditor ref={editorRef} placeholder="Write a reply..." />
          {sendError && <div className="form-error mt-2">{sendError}</div>}
          <div className="reply-actions">
            <button
              className="btn-primary"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
