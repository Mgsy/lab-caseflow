import { NextRequest, NextResponse } from 'next/server';
import { requireCustomerSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { messages, tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sanitize } from '@/lib/sanitize';

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

  const ticketRow = sqlite
    .prepare('SELECT customer_id AS customerId FROM tickets WHERE id = ?')
    .get(ticketId) as { customerId: number } | undefined;

  if (!ticketRow) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
  if (ticketRow.customerId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const after = request.nextUrl.searchParams.get('after');

  let rows: Array<{
    id: number;
    bodyHtml: string;
    createdAt: string;
    senderId: number;
    senderFirstName: string;
    senderLastName: string;
    senderRole: string;
    senderAvatarUrl: string | null;
  }>;

  if (after) {
    rows = sqlite
      .prepare(
        `
        SELECT
          m.id,
          m.body_html AS bodyHtml,
          m.created_at AS createdAt,
          u.id AS senderId,
          u.first_name AS senderFirstName,
          u.last_name AS senderLastName,
          u.role AS senderRole,
          u.avatar_url AS senderAvatarUrl
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.ticket_id = ? AND m.created_at > ? AND m.is_internal = 0
        ORDER BY m.created_at ASC
      `
      )
      .all(ticketId, after) as typeof rows;
  } else {
    rows = sqlite
      .prepare(
        `
        SELECT
          m.id,
          m.body_html AS bodyHtml,
          m.created_at AS createdAt,
          u.id AS senderId,
          u.first_name AS senderFirstName,
          u.last_name AS senderLastName,
          u.role AS senderRole,
          u.avatar_url AS senderAvatarUrl
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.ticket_id = ? AND m.is_internal = 0
        ORDER BY m.created_at ASC
      `
      )
      .all(ticketId) as typeof rows;
  }

  const result = rows.map((row) => ({
    id: row.id,
    bodyHtml: row.bodyHtml,
    createdAt: row.createdAt,
    sender: {
      id: row.senderId,
      firstName: row.senderFirstName,
      lastName: row.senderLastName,
      role: row.senderRole,
      avatarUrl: row.senderAvatarUrl,
    },
  }));

  return NextResponse.json({ messages: result });
}

export async function POST(
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

  const { db, sqlite } = getTenantDb();

  const ticketRow = sqlite
    .prepare('SELECT customer_id AS customerId FROM tickets WHERE id = ?')
    .get(ticketId) as { customerId: number } | undefined;

  if (!ticketRow) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
  if (ticketRow.customerId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { bodyHtml } = body;

  if (!bodyHtml) {
    return NextResponse.json({ error: 'bodyHtml is required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const [inserted] = await db
    .insert(messages)
    .values({
      ticketId,
      senderId: session.userId,
      bodyHtml: sanitize(bodyHtml),
      createdAt: now,
    })
    .returning();

  await db
    .update(tickets)
    .set({ updatedAt: now })
    .where(eq(tickets.id, ticketId));

  // Fetch sender info
  const sender = sqlite
    .prepare(
      `
      SELECT id, first_name AS firstName, last_name AS lastName, role, avatar_url AS avatarUrl
      FROM users WHERE id = ?
    `
    )
    .get(session.userId) as {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl: string | null;
  };

  return NextResponse.json(
    {
      message: {
        id: inserted.id,
        bodyHtml: inserted.bodyHtml,
        createdAt: inserted.createdAt,
        sender: {
          id: sender.id,
          firstName: sender.firstName,
          lastName: sender.lastName,
          role: sender.role,
          avatarUrl: sender.avatarUrl,
        },
      },
    },
    { status: 201 }
  );
}
