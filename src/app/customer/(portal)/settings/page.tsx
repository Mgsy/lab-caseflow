import type { Metadata } from 'next';
import { CustomerSettingsForm } from '@/components/customer/CustomerSettingsForm';

export const metadata: Metadata = {
  title: 'Account Settings — Caseflow',
};

export default function CustomerSettingsPage() {
  return <CustomerSettingsForm />;
}
