import type { Metadata } from 'next';
import { AgentSettingsForm } from '@/components/agent/AgentSettingsForm';

export const metadata: Metadata = {
  title: 'Settings — Caseflow',
};

export default function AgentSettingsPage() {
  return <AgentSettingsForm />;
}
