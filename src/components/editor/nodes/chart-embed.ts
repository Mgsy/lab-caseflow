import type { NodeSpec } from 'prosemirror-model';
import { sanitize } from '@/lib/sanitize';

export const chartEmbed: NodeSpec = {
  group: 'block',
  atom: true,
  attrs: {
    accountId: { default: '' },
    appId: { default: '' },
    chartId: { default: '' },
    contentType: { default: '' },
    text: { default: '' },
    url: { default: '' },
    appName: { default: '' },
  },
  parseDOM: [{
    tag: 'div[chart-id]',
    getAttrs: (domNode) => {
      const el = domNode as HTMLElement;
      return {
        accountId: el.getAttribute('account-id') || '',
        appId: el.getAttribute('app-id') || '',
        chartId: el.getAttribute('chart-id') || '',
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
    el.setAttribute('chart-id', node.attrs.chartId);
    el.setAttribute('conf-url', node.attrs.url);
    el.setAttribute('content-type', node.attrs.contentType);
    el.setAttribute('app-name', node.attrs.appName);
    el.innerHTML = sanitize(node.attrs.text);
    return el;
  },
};
