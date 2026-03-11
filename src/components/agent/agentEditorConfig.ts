/**
 * Agent workspace ProseMirror configuration.
 *
 * This file centralises every editor concern specific to the agent context:
 * which schema is active, which plugins are loaded, and which keyboard
 * shortcuts are available. CaseflowEditor (the generic component) wires
 * these together; this file makes the agent-side choices explicit and
 * auditable in isolation.
 *
 * Custom nodes registered in the schema
 * ─────────────────────────────────────
 *   spreadsheet_embed  — VULNERABLE: toDOM writes innerHTML without sanitize()
 *   chart_embed        — safe: toDOM uses sanitize()
 *   file_attachment    — safe: toDOM uses sanitize()
 *   code_snippet       — safe: toDOM uses sanitize()
 *
 * When a message is rendered in the agent ticket view the parseDOM → toDOM
 * cycle runs for every embedded node. The spreadsheet_embed node re-inserts
 * its `text` attribute directly via el.innerHTML, which is the XSS trigger
 * point for this lab.
 */

import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType, wrapIn } from 'prosemirror-commands';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import type { Plugin } from 'prosemirror-state';
import { caseflowSchema } from '@/components/editor/schema';
import { placeholderPlugin } from '@/components/editor/plugins/placeholder';

/**
 * The schema used in the agent workspace. All four custom embed nodes are
 * present; every agent message is parsed and rendered through this schema.
 */
export const agentSchema = caseflowSchema;

/**
 * Default placeholder text shown in the agent reply composer.
 */
export const AGENT_EDITOR_PLACEHOLDER = 'Write a reply...';

/**
 * Builds the ProseMirror plugin stack for the agent reply composer.
 *
 * Plugins included:
 *   - history          — undo/redo stack
 *   - keymap (custom)  — agent-specific shortcuts (bold, italic, underline,
 *                        list item enter/tab handling)
 *   - keymap (base)    — prosemirror default bindings (arrow keys, etc.)
 *   - placeholderPlugin — shows grey hint text when the editor is empty
 */
export function buildAgentEditorPlugins(placeholder: string = AGENT_EDITOR_PLACEHOLDER): Plugin[] {
  const s = agentSchema;
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

/**
 * Toolbar actions available in the agent reply composer.
 *
 * This is the canonical list — it mirrors what EditorToolbar renders inside
 * CaseflowEditor. Keeping it here makes it easy to see, at a glance, which
 * formatting options agents have when composing messages.
 */
export const AGENT_TOOLBAR_ACTIONS = [
  { label: 'B',   title: 'Bold',         command: (s: typeof agentSchema) => toggleMark(s.marks.strong) },
  { label: 'I',   title: 'Italic',       command: (s: typeof agentSchema) => toggleMark(s.marks.em) },
  { label: 'U',   title: 'Underline',    command: (s: typeof agentSchema) => toggleMark(s.marks.underline) },
  { label: 'S',   title: 'Strikethrough',command: (s: typeof agentSchema) => toggleMark(s.marks.strikethrough) },
  { label: 'H1',  title: 'Heading 1',    command: (s: typeof agentSchema) => setBlockType(s.nodes.heading, { level: 1 }) },
  { label: 'H2',  title: 'Heading 2',    command: (s: typeof agentSchema) => setBlockType(s.nodes.heading, { level: 2 }) },
  { label: 'H3',  title: 'Heading 3',    command: (s: typeof agentSchema) => setBlockType(s.nodes.heading, { level: 3 }) },
  { label: 'UL',  title: 'Bullet list',  command: (s: typeof agentSchema) => wrapInList(s.nodes.bullet_list) },
  { label: 'OL',  title: 'Ordered list', command: (s: typeof agentSchema) => wrapInList(s.nodes.ordered_list) },
  { label: '</>', title: 'Code block',   command: (s: typeof agentSchema) => setBlockType(s.nodes.code_block) },
  { label: '❝',  title: 'Blockquote',   command: (s: typeof agentSchema) => wrapIn(s.nodes.blockquote) },
] as const;
