'use client';

import { useState, useRef, useEffect } from 'react';
import { EditorView } from 'prosemirror-view';
import { insertHtmlAtCursor } from '../plugins/ai-summarize';
import { csrfHeaders } from '@/lib/csrf';

interface AIDropdownProps {
  editorView: EditorView | null;
  ticketId: number;
}

export function AIDropdown({ editorView, ticketId }: AIDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSummarize = async () => {
    if (!editorView || loading) return;
    setOpen(false);
    setLoading(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/agent/ai/summarize', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ ticketId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Summarization failed');
      }

      const { html } = await res.json();
      insertHtmlAtCursor(editorView, html);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      console.error('[CaseflowAI]', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const btnClass = [
    'ai-btn',
    loading ? 'ai-btn--loading' : '',
    status === 'success' ? 'ai-btn--success' : '',
    status === 'error' ? 'ai-btn--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="ai-dropdown-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={btnClass}
        disabled={loading}
        onClick={() => !loading && setOpen((o) => !o)}
      >
        {loading ? (
          <>
            <span className="ai-spinner" />
            Summarizing...
          </>
        ) : (
          <>
            ⚡ AI ▾
          </>
        )}
      </button>

      {open && (
        <div className="ai-menu">
          <button
            type="button"
            className="ai-menu-item"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSummarize();
            }}
          >
            Summarize last message
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="ai-error-tooltip">AI unavailable — try again</div>
      )}
    </div>
  );
}
