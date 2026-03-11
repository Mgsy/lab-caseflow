import { getIronSession } from 'iron-session';
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  userId: number;
  role: 'admin' | 'agent' | 'customer';
  portalType: 'agent' | 'customer';
  csrfToken?: string;
}

const KNOWN_TENANTS = ['acmecorp', 'attacker'] as const;
type Tenant = (typeof KNOWN_TENANTS)[number];

function isKnownTenant(s: string): s is Tenant {
  return (KNOWN_TENANTS as readonly string[]).includes(s);
}

function resolveTenantSlug(): string {
  try {
    const headerStore = headers();
    const xTenant = headerStore.get('x-tenant');
    if (xTenant && isKnownTenant(xTenant)) {
      return xTenant;
    }
    // Fallback: parse subdomain from Host
    const host = (headerStore.get('host') ?? '').split(':')[0];
    const sub = host.split('.')[0];
    if (isKnownTenant(sub)) {
      return sub;
    }
  } catch {
    // outside request context — use env or default
  }
  return process.env.TENANT ?? 'acmecorp';
}

function getSessionOptions() {
  const tenant = resolveTenantSlug();
  return {
    password: process.env.SESSION_SECRET || 'caseflow-dev-secret-key-min-32-chars!!',
    cookieName: `caseflow_session_${tenant}`,
    cookieOptions: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function requireAgentSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (
    !session.userId ||
    session.portalType !== 'agent' ||
    (session.role !== 'admin' && session.role !== 'agent')
  ) {
    return null;
  }
  return session as SessionData;
}

export async function requireCustomerSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (
    !session.userId ||
    session.portalType !== 'customer' ||
    session.role !== 'customer'
  ) {
    return null;
  }
  return session as SessionData;
}

export async function requireAdminSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (
    !session.userId ||
    session.portalType !== 'agent' ||
    session.role !== 'admin'
  ) {
    return null;
  }
  return session as SessionData;
}

export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

export async function validateCsrf(request: NextRequest): Promise<NextResponse | null> {
  const headerToken = request.headers.get('X-Caseflow-Csrf-Token');

  if (!headerToken) {
    return NextResponse.json({ error: 'Missing CSRF token' }, { status: 401 });
  }

  const session = await getSession();

  if (!session.userId || !session.csrfToken) {
    return NextResponse.json({ error: 'Missing CSRF token' }, { status: 401 });
  }

  if (headerToken !== session.csrfToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 401 });
  }

  return null;
}
