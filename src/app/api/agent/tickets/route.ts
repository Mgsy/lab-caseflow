import { NextRequest, NextResponse } from 'next/server';
import { requireAgentSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sqlite } = getTenantDb();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const search = searchParams.get('search');

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }

  if (assignee === 'me') {
    conditions.push('t.assigned_agent_id = ?');
    params.push(session.userId);
  } else if (assignee === 'unassigned') {
    conditions.push('t.assigned_agent_id IS NULL');
  }

  if (search) {
    conditions.push('t.subject LIKE ?');
    params.push(`%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
        t.tags,
        c.id AS customerId,
        c.first_name AS customerFirstName,
        c.last_name AS customerLastName,
        c.email AS customerEmail,
        a.id AS agentId,
        a.first_name AS agentFirstName,
        a.last_name AS agentLastName,
        a.nickname AS agentNickname,
        (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS messageCount,
        (SELECT MAX(m.created_at) FROM messages m WHERE m.ticket_id = t.id) AS lastMessageAt
      FROM tickets t
      JOIN users c ON c.id = t.customer_id
      LEFT JOIN users a ON a.id = t.assigned_agent_id
      ${where}
      ORDER BY t.updated_at DESC
    `
    )
    .all(...params) as Array<{
    id: number;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    tags: string;
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    agentId: number | null;
    agentFirstName: string | null;
    agentLastName: string | null;
    agentNickname: string | null;
    messageCount: number;
    lastMessageAt: string | null;
  }>;

  const tickets = rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: (() => {
      try {
        return JSON.parse(row.tags || '[]');
      } catch {
        return [];
      }
    })(),
    customer: {
      id: row.customerId,
      firstName: row.customerFirstName,
      lastName: row.customerLastName,
      email: row.customerEmail,
    },
    assignedAgent: row.agentId
      ? {
          id: row.agentId,
          firstName: row.agentFirstName,
          lastName: row.agentLastName,
          nickname: row.agentNickname,
        }
      : null,
    messageCount: row.messageCount,
    lastMessageAt: row.lastMessageAt,
  }));

  return NextResponse.json({ tickets });
}
