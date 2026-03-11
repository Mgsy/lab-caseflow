export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)caseflow-csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function csrfHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Caseflow-Csrf-Token': getCsrfToken(),
    ...extra,
  };
}
