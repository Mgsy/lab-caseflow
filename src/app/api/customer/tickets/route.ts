import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { tickets, messages, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sanitize } from '@/lib/sanitize';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sqlite } = getTenantDb();

  const rows = sqlite
    .prepare(
      `
      SELECT
        t.id,
        t.subject,
        t.status,
        t.priority,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS messageCount,
        (SELECT MAX(m.created_at) FROM messages m WHERE m.ticket_id = t.id) AS lastMessageAt
      FROM tickets t
      WHERE t.customer_id = ?
      ORDER BY t.updated_at DESC
    `
    )
    .all(session.userId) as Array<{
    id: number;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    lastMessageAt: string | null;
  }>;

  return NextResponse.json({ tickets: rows });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { subject, bodyHtml } = body;

  if (!subject || !bodyHtml) {
    return NextResponse.json(
      { error: 'subject and bodyHtml are required' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { db, tenant } = getTenantDb();

  // Verify the user exists in this tenant's database before inserting
  const userCheck = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (userCheck.length === 0) {
    console.error(`[tickets] User ${session.userId} not found in tenant ${tenant}`);
    return NextResponse.json(
      { error: 'Session user not found in this tenant' },
      { status: 403 }
    );
  }

  const [ticket] = await db
    .insert(tickets)
    .values({
      subject,
      customerId: session.userId,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [message] = await db
    .insert(messages)
    .values({
      ticketId: ticket.id,
      senderId: session.userId,
      bodyHtml: sanitize(bodyHtml),
      createdAt: now,
    })
    .returning();

  return NextResponse.json(
    {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
      },
      message: {
        id: message.id,
        bodyHtml: message.bodyHtml,
      },
    },
    { status: 201 }
  );
}
