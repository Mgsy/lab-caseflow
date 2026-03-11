import { NextRequest, NextResponse } from 'next/server';

const TENANT_MAP: Record<string, string> = {
  'acmecorp.caseflow.io': 'acmecorp',
  'attacker.caseflow.io': 'attacker',
};

export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get('host') ?? '';
  // Strip port if present (e.g. localhost:3000 → localhost)
  const hostname = host.split(':')[0];

  // Resolve tenant slug
  let tenant: string | undefined = TENANT_MAP[hostname];

  if (!tenant) {
    // Allow bare localhost for development — map to acmecorp
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      tenant = 'acmecorp';
    } else {
      return new NextResponse(null, { status: 404 });
    }
  }

  // Clone the request headers and inject x-tenant
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant', tenant);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
