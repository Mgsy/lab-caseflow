import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, validateCsrf } from '@/lib/auth';
import { getTenantDb } from '@/lib/tenant';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, firstName, lastName, role } = body;

  if (!email || !password || !firstName || !lastName || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (role !== 'agent' && role !== 'admin') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const { db } = getTenantDb();

  try {
    const [inserted] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    return NextResponse.json({ user: inserted }, { status: 201 });
  } catch (err) {
    const error = err as { message?: string };
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
    throw err;
  }
}
