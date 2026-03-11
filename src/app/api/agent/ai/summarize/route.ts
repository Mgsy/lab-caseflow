import { NextRequest, NextResponse } from 'next/server';
import { requireAgentSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { tickets, messages, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { summarize } from '@/lib/ai';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { ticketId } = body as { ticketId?: unknown };
  if (!ticketId || typeof ticketId !== 'number') {
    return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 });
  }

  const { db } = getTenantDb();

  const ticket = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .get();

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const lastCustomerMessage = await db
    .select({
      id: messages.id,
      bodyHtml: messages.bodyHtml,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(
      and(
        eq(messages.ticketId, ticketId),
        eq(users.role, 'customer')
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(1)
    .get();

  if (!lastCustomerMessage) {
    return NextResponse.json({ error: 'No customer messages in this ticket' }, { status: 404 });
  }

  const result = await summarize(lastCustomerMessage.bodyHtml);

  return NextResponse.json(result);
}
