'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaseflowEditor, CaseflowEditorHandle } from '@/components/editor/CaseflowEditor';
import { csrfHeaders } from '@/lib/csrf';

export function CreateTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const editorRef = useRef<CaseflowEditorHandle>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Please enter a subject.');
      return;
    }

    if (!editorRef.current || editorRef.current.isEmpty()) {
      setError('Please write a message describing your issue.');
      return;
    }

    setSubmitting(true);

    const bodyHtml = editorRef.current.getHTML();

    try {
      const res = await fetch('/api/customer/tickets', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ subject: subject.trim(), bodyHtml }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create ticket');
        return;
      }

      router.push(`/customer/tickets/${data.ticket.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link href="/customer/dashboard" className="back-link">
            ← My Tickets
          </Link>
          <h1 className="page-title mt-2">New Ticket</h1>
          <p className="page-subtitle">Describe your issue and our team will get back to you</p>
        </div>
      </div>

      <div className="create-ticket-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-5">
            <label className="form-label" htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group mb-5">
            <label className="form-label">Message</label>
            <CaseflowEditor
              ref={editorRef}
              placeholder="Describe your issue in detail. Include any relevant steps to reproduce, error messages, or screenshots."
            />
          </div>

          {error && <div className="form-error mb-4">{error}</div>}

          <div className="form-actions-row">
            <Link href="/customer/dashboard" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
