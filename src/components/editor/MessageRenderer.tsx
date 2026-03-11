'use client';

import { useEffect, useRef } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser as ProseDOMParser } from 'prosemirror-model';
import { caseflowSchema } from './schema';
import { sanitize } from '@/lib/sanitize';

interface MessageRendererProps {
  bodyHtml: string;
  className?: string;
}

/**
 * Renders a message HTML through ProseMirror (read-only).
 *
 * The HTML is sanitized before being parsed, so content from the server is
 * safe. The parseDOM → toDOM cycle through ProseMirror's schema is still
 * used for correct node rendering.
 */
export function MessageRenderer({ bodyHtml, className = '' }: MessageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const domContainer = document.createElement('div');
    domContainer.innerHTML = sanitize(bodyHtml);
    const doc = ProseDOMParser.fromSchema(caseflowSchema).parse(domContainer);

    const state = EditorState.create({
      doc,
      schema: caseflowSchema,
      plugins: [],
    });

    const view = new EditorView(containerRef.current, {
      state,
      editable: () => false,
      attributes: { class: 'pm-message-body' },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [bodyHtml]);

  return <div ref={containerRef} className={`message-renderer ${className}`} />;
}
