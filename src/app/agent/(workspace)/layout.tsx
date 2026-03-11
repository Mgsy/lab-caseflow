import { redirect } from 'next/navigation';
import { requireAgentSession } from '@/lib/auth';
import { AgentSidebar } from '@/components/agent/AgentSidebar';

export default async function AgentWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAgentSession();
  if (!session) {
    redirect('/agent/login');
  }

  return (
    <div className="agent-shell">
      <AgentSidebar userId={session.userId} role={session.role} />
      <main className="agent-main">{children}</main>
    </div>
  );
}
