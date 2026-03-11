import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'a',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'span', 'div', 'img', 'hr', 'table', 'thead',
  'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['class', 'id', 'href', 'src', 'alt', 'target', 'rel', 'style'];

export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
