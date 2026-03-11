import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export function placeholderPlugin(text: string): Plugin {
  return new Plugin({
    props: {
      decorations(state) {
        const doc = state.doc;
        if (
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild?.content.size === 0
        ) {
          const decoration = Decoration.node(0, doc.content.size, {
            'data-placeholder': text,
            class: 'pm-placeholder',
          });
          return DecorationSet.create(doc, [decoration]);
        }
        return DecorationSet.empty;
      },
    },
  });
}
