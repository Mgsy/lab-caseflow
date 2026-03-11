'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  isInternal: boolean;
  createdAt: string;
  sender: Sender;
}

interface TicketDetail {
  id: number;
  subject: string;
  status: 'new' | 'open' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  customer: { id: number; firstName: string; lastName: string; email: string; avatarUrl?: string; createdAt?: string };
  assignedAgent: { id: number; firstName: string; lastName: string; nickname?: string; avatarUrl?: string } | null;
}

interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  nickname?: string;
}

const POLL_INTERVAL = 3000;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function TicketDetailView({ ticketId }: { ticketId: number }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [newMessageIds, setNewMessageIds] = useState<Set<number>>(new Set());

  const [editorMode, setEditorMode] = useState<'message' | 'internal'>('message');

  const editorRef = useRef<CaseflowEditorHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string>('');

  // Sidebar state
  const [sidebarStatus, setSidebarStatus] = useState<string>('');
  const [sidebarPriority, setSidebarPriority] = useState<string>('');
  const [sidebarAssignee, setSidebarAssignee] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [metaKey, setMetaKey] = useState('');
  const [metaVal, setMetaVal] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [sidebarSaving, setSidebarSaving] = useState(false);

  // Fetch ticket detail
  useEffect(() => {
    fetch(`/api/agent/tickets/${ticketId}`, {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ticket) {
          const t = data.ticket;
          setTicket(t);
          setSidebarStatus(t.status);
          setSidebarPriority(t.priority || 'normal');
          setSidebarAssignee(t.assignedAgent?.id?.toString() || '');
          setTags(Array.isArray(t.tags) ? t.tags : []);
          setMetadata(t.metadata || {});
        }
        setLoading(false);
      });
  }, [ticketId]);

  // Fetch initial messages
  useEffect(() => {
    fetch(`/api/agent/tickets/${ticketId}/messages`, {
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

  // Fetch agents list
  useEffect(() => {
    fetch('/api/agent/users', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((d) => setAgents(d.users || []));
  }, []);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      const after = lastTimestampRef.current;
      const url = `/api/agent/tickets/${ticketId}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`;
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
    const isInternal = editorMode === 'internal';
    try {
      const res = await fetch(`/api/agent/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ bodyHtml, isInternal }),
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

      // Only update ticket status for real replies (not internal comments)
      if (!isInternal && ticket?.status === 'new') {
        setTicket((prev) => prev ? { ...prev, status: 'open' } : prev);
        setSidebarStatus('open');
      }
    } catch {
      setSendError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function saveSidebarField(field: Partial<{
    status: string;
    priority: string;
    assignedAgentId: number | null;
    tags: string[];
    metadata: Record<string, string>;
  }>) {
    setSidebarSaving(true);
    const res = await fetch(`/api/agent/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: csrfHeaders(),
      body: JSON.stringify(field),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ticket) {
        setTicket(data.ticket);
      }
    }
    setSidebarSaving(false);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      saveSidebarField({ tags: next });
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveSidebarField({ tags: next });
  }

  function addMeta() {
    if (!metaKey.trim()) return;
    const next = { ...metadata, [metaKey.trim()]: metaVal.trim() };
    setMetadata(next);
    saveSidebarField({ metadata: next });
    setMetaKey('');
    setMetaVal('');
  }

  function removeMeta(key: string) {
    const next = { ...metadata };
    delete next[key];
    setMetadata(next);
    saveSidebarField({ metadata: next });
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

  return (
    <div className="ticket-detail-shell">
      {/* Main conversation area */}
      <div className="ticket-main">
        <div className="ticket-detail-header">
          <Link href="/agent/dashboard" className="back-link">
            ← Tickets
          </Link>
          <h1 className="ticket-detail-title">{ticket.subject}</h1>
          <div className="ticket-detail-meta">
            <span className={`status-badge status-${ticket.status}`}>
              {ticket.status}
            </span>
            {ticket.priority && ticket.priority !== 'normal' && (
              <span className={`priority-badge priority-${ticket.priority}`}>
                {ticket.priority}
              </span>
            )}
            <span className="muted-text text-sm">#{ticket.id}</span>
          </div>
        </div>

        {/* Messages */}
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
                  className={`message-bubble ${isAgent ? 'message-agent' : 'message-customer'} ${isNew ? 'message-new' : ''} ${msg.isInternal ? 'message--internal' : ''}`}
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
                        {msg.sender.role === 'customer' ? 'Customer' : 'Agent'}
                      </span>
                      {msg.isInternal && (
                        <span className="message-internal-badge">Internal</span>
                      )}
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

        {/* Reply editor */}
        <div className="reply-area">
          {ticket.status === 'closed' && (
            <div className="ticket-closed-banner">
              This ticket is closed. Change the status above to reopen it.
            </div>
          )}
          <div className="editor-tabs">
            <button
              className={`editor-tab${editorMode === 'message' ? ' editor-tab--active' : ''}`}
              onClick={() => setEditorMode('message')}
              type="button"
            >
              Message
            </button>
            <button
              className={`editor-tab editor-tab--internal${editorMode === 'internal' ? ' editor-tab--active' : ''}`}
              onClick={() => setEditorMode('internal')}
              type="button"
            >
              Internal comment
            </button>
          </div>
          <div className={editorMode === 'internal' ? 'editor-wrapper--internal' : undefined}>
            <CaseflowEditor
              ref={editorRef}
              placeholder={editorMode === 'internal' ? 'Write an internal comment...' : 'Write a reply...'}
              ticketId={ticketId}
            />
          </div>
          {sendError && <div className="form-error mt-2">{sendError}</div>}
          <div className="reply-actions">
            <button
              className={editorMode === 'internal' ? 'btn-internal' : 'btn-primary'}
              onClick={handleSend}
              disabled={sending}
            >
              {sending
                ? 'Sending...'
                : editorMode === 'internal'
                  ? 'Add Internal Comment'
                  : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="ticket-sidebar">
        {/* Status */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Status</div>
          <select
            className="form-select-sm w-full"
            value={sidebarStatus}
            onChange={(e) => {
              setSidebarStatus(e.target.value);
              saveSidebarField({ status: e.target.value });
            }}
          >
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Assignee */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Assignee</div>
          <select
            className="form-select-sm w-full"
            value={sidebarAssignee}
            onChange={(e) => {
              setSidebarAssignee(e.target.value);
              saveSidebarField({
                assignedAgentId: e.target.value ? parseInt(e.target.value, 10) : null,
              });
            }}
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Priority</div>
          <select
            className="form-select-sm w-full"
            value={sidebarPriority}
            onChange={(e) => {
              setSidebarPriority(e.target.value);
              saveSidebarField({ priority: e.target.value });
            }}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Customer info */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Customer</div>
          <div className="customer-info">
            <div className="customer-avatar">
              {ticket.customer.avatarUrl ? (
                <img src={ticket.customer.avatarUrl} alt="" />
              ) : (
                <span>{initials(ticket.customer.firstName, ticket.customer.lastName)}</span>
              )}
            </div>
            <div>
              <div className="customer-name">
                {ticket.customer.firstName} {ticket.customer.lastName}
              </div>
              <div className="customer-email">{ticket.customer.email}</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Tags</div>
          <div className="tags-row mb-2">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill tag-removable">
                {tag}
                <button
                  className="tag-remove"
                  onClick={() => removeTag(tag)}
                  title="Remove tag"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="tag-input-row">
            <input
              type="text"
              className="form-input-sm flex-1"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button className="btn-secondary-sm" onClick={addTag}>+</button>
          </div>
        </div>

        {/* Metadata */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Metadata</div>
          {Object.entries(metadata).map(([k, v]) => (
            <div key={k} className="meta-row">
              <span className="meta-key">{k}</span>
              <span className="meta-val">{v}</span>
              <button className="meta-remove" onClick={() => removeMeta(k)}>×</button>
            </div>
          ))}
          <div className="meta-add-row">
            <input
              type="text"
              className="form-input-sm"
              placeholder="Key"
              value={metaKey}
              onChange={(e) => setMetaKey(e.target.value)}
            />
            <input
              type="text"
              className="form-input-sm"
              placeholder="Value"
              value={metaVal}
              onChange={(e) => setMetaVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMeta();
                }
              }}
            />
            <button className="btn-secondary-sm" onClick={addMeta}>+</button>
          </div>
        </div>

        {/* Timestamps */}
        <div className="sidebar-section">
          <div className="sidebar-section-label">Timestamps</div>
          <div className="timestamp-row">
            <span className="timestamp-label">Created</span>
            <span className="timestamp-val">{formatDateTime(ticket.createdAt)}</span>
          </div>
          <div className="timestamp-row">
            <span className="timestamp-label">Updated</span>
            <span className="timestamp-val">{formatDateTime(ticket.updatedAt)}</span>
          </div>
          {ticket.closedAt && (
            <div className="timestamp-row">
              <span className="timestamp-label">Closed</span>
              <span className="timestamp-val">{formatDateTime(ticket.closedAt)}</span>
            </div>
          )}
        </div>

        {sidebarSaving && (
          <div className="sidebar-saving-indicator">Saving...</div>
        )}
      </aside>
    </div>
  );
}
