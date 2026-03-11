import { headers } from 'next/headers';
import { getDb } from '@/lib/db';

const KNOWN_TENANTS = ['acmecorp', 'attacker'] as const;
type Tenant = (typeof KNOWN_TENANTS)[number];

function isKnownTenant(s: string): s is Tenant {
  return (KNOWN_TENANTS as readonly string[]).includes(s);
}

export function getTenant(): string {
  // CLI fallback — used by seed/migrate scripts where next/headers is unavailable
  if (typeof process !== 'undefined' && process.env.TENANT) {
    const envTenant = process.env.TENANT;
    if (isKnownTenant(envTenant)) {
      return envTenant;
    }
  }

  // Runtime path — read Host header set by middleware
  let host: string | null = null;
  try {
    const headerStore = headers();
    host = headerStore.get('x-tenant') ?? headerStore.get('host') ?? null;
  } catch {
    // headers() throws outside of request context (e.g. during build)
    return 'acmecorp';
  }

  if (!host) {
    return 'acmecorp';
  }

  // x-tenant header is already the resolved slug (set by middleware)
  if (isKnownTenant(host)) {
    return host;
  }

  // Fallback: parse subdomain from raw Host header
  const subdomain = host.split('.')[0];
  if (isKnownTenant(subdomain)) {
    return subdomain;
  }

  // localhost / unknown → default to acmecorp
  return 'acmecorp';
}

export function getTenantDb() {
  const tenant = getTenant();
  const { db, sqlite } = getDb(tenant);
  return { db, sqlite, tenant };
}
