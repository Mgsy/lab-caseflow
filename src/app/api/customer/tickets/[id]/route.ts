import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';

interface RouteContext {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ticketId = parseInt(params.id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
  }

  const { sqlite } = getTenantDb();

  const row = sqlite
    .prepare(
      `
      SELECT
        t.id,
        t.subject,
        t.status,
        t.priority,
        t.customer_id AS customerId,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt
      FROM tickets t
      WHERE t.id = ?
    `
    )
    .get(ticketId) as {
    id: number;
    subject: string;
    status: string;
    priority: string;
    customerId: number;
    createdAt: string;
    updatedAt: string;
  } | undefined;

  if (!row) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  if (row.customerId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    ticket: {
      id: row.id,
      subject: row.subject,
      status: row.status,
      priority: row.priority,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  });
}
