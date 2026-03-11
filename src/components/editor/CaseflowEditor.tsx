'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMSerializer } from 'prosemirror-model';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { caseflowSchema } from './schema';
import { placeholderPlugin } from './plugins/placeholder';
import { AIDropdown } from './toolbar/AIDropdown';

export interface CaseflowEditorHandle {
  getHTML: () => string;
  clear: () => void;
  isEmpty: () => boolean;
}

interface CaseflowEditorProps {
  placeholder?: string;
  className?: string;
  ticketId?: number;
}

export const CaseflowEditor = forwardRef<CaseflowEditorHandle, CaseflowEditorProps>(
  function CaseflowEditor({ placeholder = 'Write a message...', className = '', ticketId }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [editorView, setEditorView] = useState<EditorView | null>(null);

    useImperativeHandle(ref, () => ({
      getHTML() {
        if (!viewRef.current) return '';
        const serializer = DOMSerializer.fromSchema(caseflowSchema);
        const fragment = serializer.serializeFragment(viewRef.current.state.doc.content);
        const div = document.createElement('div');
        div.appendChild(fragment);
        return div.innerHTML;
      },
      clear() {
        if (!viewRef.current) return;
        const emptyState = EditorState.create({
          schema: caseflowSchema,
          plugins: buildPlugins(placeholder),
        });
        viewRef.current.updateState(emptyState);
      },
      isEmpty() {
        if (!viewRef.current) return true;
        const doc = viewRef.current.state.doc;
        return (
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock === true &&
          doc.firstChild?.content.size === 0
        );
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const editorDiv = containerRef.current.querySelector<HTMLElement>('.pm-editor');
      if (!editorDiv) return;

      const state = EditorState.create({
        schema: caseflowSchema,
        plugins: buildPlugins(placeholder),
      });

      const view = new EditorView(editorDiv, { state });
      viewRef.current = view;
      setEditorView(view);

      return () => {
        view.destroy();
        viewRef.current = null;
        setEditorView(null);
      };
    }, [placeholder]);

    return (
      <div className={`caseflow-editor-wrap ${className}`} ref={containerRef}>
        <EditorToolbar viewRef={viewRef} editorView={editorView} ticketId={ticketId} />
        <div className="pm-editor-container">
          <div className="pm-editor" />
        </div>
      </div>
    );
  }
);

function buildPlugins(placeholder: string) {
  const s = caseflowSchema;
  return [
    history(),
    keymap({
      'Mod-z': undo,
      'Mod-y': redo,
      'Mod-Shift-z': redo,
      'Mod-b': toggleMark(s.marks.strong),
      'Mod-i': toggleMark(s.marks.em),
      'Mod-u': toggleMark(s.marks.underline),
      'Enter': splitListItem(s.nodes.list_item),
      'Tab': sinkListItem(s.nodes.list_item),
      'Shift-Tab': liftListItem(s.nodes.list_item),
    }),
    keymap(baseKeymap),
    placeholderPlugin(placeholder),
  ];
}

interface ToolbarProps {
  viewRef: React.RefObject<EditorView | null>;
  editorView: EditorView | null;
  ticketId?: number;
}

const COLORS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Yellow', value: '#f59e0b' },
  { label: 'Gray', value: '#9b9c9d' },
  { label: 'Message BG', value: '#303035' },
];

function EditorToolbar({ viewRef, editorView, ticketId }: ToolbarProps) {
  const s = caseflowSchema;
  const [fontSizeValue, setFontSizeValue] = useState('');
  const [colorOpen, setColorOpen] = useState(false);
  const [activeColor, setActiveColor] = useState('#ffffff');
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colorOpen) return;
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [colorOpen]);

  function run(fn: (state: EditorState, dispatch: EditorView['dispatch']) => boolean) {
    const view = viewRef.current;
    if (!view) return;
    fn(view.state, view.dispatch);
    view.focus();
  }

  function btn(label: string, title: string, action: () => void) {
    return (
      <button
        key={label}
        type="button"
        title={title}
        onMouseDown={(e) => {
          e.preventDefault();
          action();
        }}
        className="toolbar-btn"
      >
        {label}
      </button>
    );
  }

  function applyFontSize() {
    const view = viewRef.current;
    if (!view || !fontSizeValue) return;
    const size = parseFloat(fontSizeValue);
    if (isNaN(size) || size <= 0 || size > 200) return;
    const mark = s.marks.fontSize.create({ size: `${size}px` });
    const { from, to } = view.state.selection;
    if (from === to) return;
    const tr = view.state.tr.addMark(from, to, mark);
    view.dispatch(tr);
    view.focus();
  }

  function applyColor(color: string) {
    const view = viewRef.current;
    if (!view) return;
    const mark = s.marks.fontColor.create({ color });
    const { from, to } = view.state.selection;
    if (from === to) return;
    const tr = view.state.tr.addMark(from, to, mark);
    view.dispatch(tr);
    view.focus();
    setActiveColor(color);
    setColorOpen(false);
  }

  return (
    <div className="pm-toolbar">
      {btn('B', 'Bold', () => run(toggleMark(s.marks.strong)))}
      {btn('I', 'Italic', () => run(toggleMark(s.marks.em)))}
      {btn('U', 'Underline', () => run(toggleMark(s.marks.underline)))}
      {btn('S', 'Strikethrough', () => run(toggleMark(s.marks.strikethrough)))}
      <span className="toolbar-sep" />
      {btn('H1', 'Heading 1', () => run(setBlockType(s.nodes.heading, { level: 1 })))}
      {btn('H2', 'Heading 2', () => run(setBlockType(s.nodes.heading, { level: 2 })))}
      {btn('H3', 'Heading 3', () => run(setBlockType(s.nodes.heading, { level: 3 })))}
      <span className="toolbar-sep" />
      {btn('UL', 'Bullet list', () => run(wrapInList(s.nodes.bullet_list)))}
      {btn('OL', 'Ordered list', () => run(wrapInList(s.nodes.ordered_list)))}
      <span className="toolbar-sep" />
      {btn('</>', 'Code block', () => run(setBlockType(s.nodes.code_block)))}
      {btn('❝', 'Blockquote', () => run(wrapIn(s.nodes.blockquote)))}
      {ticketId !== undefined && (
        <>
          <span className="toolbar-sep" />
          <AIDropdown editorView={editorView} ticketId={ticketId} />
        </>
      )}
      <span className="toolbar-sep" />
      {/* Color picker */}
      <div className="toolbar-color" ref={colorRef}>
        <button
          type="button"
          title="Font color"
          className="toolbar-color-btn"
          onMouseDown={(e) => {
            e.preventDefault();
            setColorOpen((v) => !v);
          }}
        >
          A
          <span className="toolbar-color-indicator" style={{ background: activeColor }} />
        </button>
        {colorOpen && (
          <div className="toolbar-color-dropdown">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                className="toolbar-color-swatch"
                style={{ background: c.value }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyColor(c.value);
                }}
              />
            ))}
          </div>
        )}
      </div>
      {/* Font size */}
      <div className="toolbar-fontsize">
        <input
          type="text"
          className="toolbar-fontsize-input"
          value={fontSizeValue}
          placeholder="14"
          onChange={(e) => setFontSizeValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyFontSize();
            }
          }}
          onBlur={applyFontSize}
          title="Font size (px)"
        />
        <span className="toolbar-fontsize-label">px</span>
      </div>
    </div>
  );
}
