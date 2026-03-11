import { EditorView } from 'prosemirror-view';
import { DOMParser as ProseDOMParser } from 'prosemirror-model';
import { caseflowSchema } from '../schema';

export function insertHtmlAtCursor(view: EditorView, html: string): void {
  const container = document.createElement('div');
  container.innerHTML = html;

  const parser = ProseDOMParser.fromSchema(caseflowSchema);
  const slice = parser.parseSlice(container);

  const { state } = view;
  const { from, to } = state.selection;
  const tr = state.tr.replaceRange(from, to, slice);

  view.dispatch(tr);
  view.focus();
}
