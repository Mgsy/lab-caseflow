import { NextRequest, NextResponse } from 'next/server';
import { requireAgentSession, validateCsrf } from '@/lib/auth';
import { isAIAvailable } from '@/lib/ai';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const csrfError = await validateCsrf(request);
  if (csrfError) return csrfError;

  const session = await requireAgentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const available = await isAIAvailable();
  return NextResponse.json({ available });
}
