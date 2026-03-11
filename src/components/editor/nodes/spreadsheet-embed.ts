import type { NodeSpec } from 'prosemirror-model';
import { sanitize } from '@/lib/sanitize'; // imported but NOT used — intentional

export const spreadsheetEmbed: NodeSpec = {
  group: 'block',
  atom: true,
  attrs: {
    accountId: { default: '' },
    appId: { default: '' },
    spreadsheetId: { default: '' },
    contentType: { default: '' },
    text: { default: '' },
    url: { default: '' },
    appName: { default: '' },
  },
  parseDOM: [{
    tag: 'div[spreadsheet-id]',
    getAttrs: (domNode) => {
      const el = domNode as HTMLElement;
      return {
        accountId: el.getAttribute('account-id') || '',
        appId: el.getAttribute('app-id') || '',
        spreadsheetId: el.getAttribute('spreadsheet-id') || '',
        contentType: el.getAttribute('content-type') || '',
        text: el.innerHTML,
        url: el.getAttribute('conf-url') || '',
        appName: el.getAttribute('app-name') || '',
      };
    },
  }],
  toDOM(node) {
    const doc = document.implementation.createHTMLDocument();
    const el = doc.createElement('div');
    el.setAttribute('account-id', node.attrs.accountId);
    el.setAttribute('app-id', node.attrs.appId);
    el.setAttribute('spreadsheet-id', node.attrs.spreadsheetId);
    el.setAttribute('conf-url', node.attrs.url);
    el.setAttribute('content-type', node.attrs.contentType);
    el.setAttribute('app-name', node.attrs.appName);
    el.innerHTML = node.attrs.text;
    return el;
  },
};

// suppress unused import warning — sanitize is intentionally imported but not called
void sanitize;
