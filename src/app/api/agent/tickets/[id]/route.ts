import { NextRequest, NextResponse } from 'next/server';
import { requireAgentSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface RouteContext {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
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
        t.tags,
        t.metadata,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt,
        t.closed_at AS closedAt,
        c.id AS customerId,
        c.first_name AS customerFirstName,
        c.last_name AS customerLastName,
        c.email AS customerEmail,
        c.avatar_url AS customerAvatarUrl,
        a.id AS agentId,
        a.first_name AS agentFirstName,
        a.last_name AS agentLastName,
        a.nickname AS agentNickname,
        a.avatar_url AS agentAvatarUrl
      FROM tickets t
      JOIN users c ON c.id = t.customer_id
      LEFT JOIN users a ON a.id = t.assigned_agent_id
      WHERE t.id = ?
    `
    )
    .get(ticketId) as {
    id: number;
    subject: string;
    status: string;
    priority: string;
    tags: string;
    metadata: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerAvatarUrl: string | null;
    agentId: number | null;
    agentFirstName: string | null;
    agentLastName: string | null;
    agentNickname: string | null;
    agentAvatarUrl: string | null;
  } | undefined;

  if (!row) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const ticket = {
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    tags: (() => {
      try {
        return JSON.parse(row.tags || '[]');
      } catch {
        return [];
      }
    })(),
    metadata: (() => {
      try {
        return JSON.parse(row.metadata || '{}');
      } catch {
        return {};
      }
    })(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
    customer: {
      id: row.customerId,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      email: row.customerEmail,
      avatarUrl: row.customerAvatarUrl,
    },
    assignedAgent: row.agentId
      ? {
          id: row.agentId,
          firstName: row.agentFirstName,
          lastName: row.agentLastName,
          nickname: row.agentNickname,
          avatarUrl: row.agentAvatarUrl,
        }
      : null,
  };

  return NextResponse.json({ ticket });
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ticketId = parseInt(params.id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
  }

  const { db, sqlite } = getTenantDb();

  const [existing] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId));

  if (!existing) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const body = await request.json();
  const { status, assignedAgentId, priority, tags, metadata } = body;

  const updates: Record<string, string | number | null> = {
    updatedAt: new Date().toISOString(),
  };

  if (status !== undefined) {
    updates.status = status;
    if (status === 'open' && !existing.assignedAgentId) {
      updates.assignedAgentId = session.userId;
    }
    if (status === 'closed') {
      updates.closedAt = new Date().toISOString();
    }
  }

  if (assignedAgentId !== undefined) {
    updates.assignedAgentId = assignedAgentId;
  }

  if (priority !== undefined) {
    updates.priority = priority;
  }

  if (tags !== undefined) {
    updates.tags = JSON.stringify(tags);
  }

  if (metadata !== undefined) {
    updates.metadata = JSON.stringify(metadata);
  }

  await db.update(tickets).set(updates).where(eq(tickets.id, ticketId));

  // Re-fetch the updated ticket
  const row = sqlite
    .prepare(
      `
      SELECT
        t.id,
        t.subject,
        t.status,
        t.priority,
        t.tags,
        t.metadata,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt,
        t.closed_at AS closedAt,
        c.id AS customerId,
        c.first_name AS customerFirstName,
        c.last_name AS customerLastName,
        c.email AS customerEmail,
        c.avatar_url AS customerAvatarUrl,
        a.id AS agentId,
        a.first_name AS agentFirstName,
        a.last_name AS agentLastName,
        a.nickname AS agentNickname,
        a.avatar_url AS agentAvatarUrl
      FROM tickets t
      JOIN users c ON c.id = t.customer_id
      LEFT JOIN users a ON a.id = t.assigned_agent_id
      WHERE t.id = ?
    `
    )
    .get(ticketId) as {
    id: number;
    subject: string;
    status: string;
    priority: string;
    tags: string;
    metadata: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerAvatarUrl: string | null;
    agentId: number | null;
    agentFirstName: string | null;
    agentLastName: string | null;
    agentNickname: string | null;
    agentAvatarUrl: string | null;
  };

  const ticket = {
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    tags: (() => {
      try {
        return JSON.parse(row.tags || '[]');
      } catch {
        return [];
      }
    })(),
    metadata: (() => {
      try {
        return JSON.parse(row.metadata || '{}');
      } catch {
        return {};
      }
    })(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    closedAt: row.closedAt,
    customer: {
      id: row.customerId,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      email: row.customerEmail,
      avatarUrl: row.customerAvatarUrl,
    },
    assignedAgent: row.agentId
      ? {
          id: row.agentId,
          firstName: row.agentFirstName,
          lastName: row.agentLastName,
          nickname: row.agentNickname,
          avatarUrl: row.agentAvatarUrl,
        }
      : null,
  };

  return NextResponse.json({ ticket });
}
