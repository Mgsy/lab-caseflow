import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getTenantDb } from '@/lib/tenant';
import { users } from '@/lib/db/schema';
import { getSession, generateCsrfToken } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    };

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const { db } = getTenantDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'customer',
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      });

    const user = inserted[0];

    const csrfToken = generateCsrfToken();

    const session = await getSession();
    session.userId = user.id;
    session.role = 'customer';
    session.portalType = 'customer';
    session.csrfToken = csrfToken;
    await session.save();

    const response = NextResponse.json({ user }, { status: 201 });

    response.cookies.set('caseflow-csrf', csrfToken, {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
