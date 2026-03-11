import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession, validateCsrf } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const flag = process.env.LAB_FLAG || 'mgsy.dev{innerHTML_4lw4ys_l1es}';

  return NextResponse.json({ flag });
}
