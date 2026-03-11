import { NextRequest, NextResponse } from 'next/server';
import { requireAgentSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = getTenantDb();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { firstName, lastName, nickname, email, password, avatarUrl } = body;

  const updates: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  };

  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (nickname !== undefined) updates.nickname = nickname;
  if (email !== undefined) updates.email = email;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const { db } = getTenantDb();

  await db.update(users).set(updates).where(eq(users.id, session.userId));

  const [updated] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      nickname: users.nickname,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, session.userId));

  return NextResponse.json({ user: updated });
}
