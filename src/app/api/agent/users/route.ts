import { NextRequest, NextResponse } from 'next/server';
import { requireAgentSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { users } from '@/lib/db/schema';
import { or, eq } from 'drizzle-orm';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = getTenantDb();

  const result = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(or(eq(users.role, 'admin'), eq(users.role, 'agent')));

  return NextResponse.json({ users: result });
}
