import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getTenantDb } from '@/lib/tenant';
import { users } from '@/lib/db/schema';
import { getSession, generateCsrfToken } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { db } = getTenantDb();

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = result[0];

    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const csrfToken = generateCsrfToken();

    const session = await getSession();
    session.userId = user.id;
    session.role = user.role;
    session.portalType = 'agent';
    session.csrfToken = csrfToken;
    await session.save();

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nickname: user.nickname,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

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
