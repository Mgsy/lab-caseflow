import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth';
import { getTenant } from '@/lib/tenant';

export const metadata: Metadata = {
  title: 'Internal — Caseflow',
};

export default async function AdminInternalPage() {
  const session = await requireAdminSession();
  if (!session) {
    redirect('/agent/dashboard');
  }

  const tenant = getTenant();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Internal</h1>
          <p className="page-subtitle">Service configuration and integration credentials for this instance.</p>
        </div>
      </div>

      {tenant === 'acmecorp' ? (
        <AcmeInternalConfig />
      ) : (
        <div className="internal-empty-state">
          <p>Internal services are not configured for this tenant.</p>
          <p className="internal-empty-hint">Contact your platform administrator to enable internal integrations.</p>
        </div>
      )}
    </div>
  );
}

function AcmeInternalConfig() {
  const flag = process.env.LAB_FLAG || 'mgsy.dev{innerHTML_4lw4ys_l1es}';

  return (
    <div className="internal-sections">
      <section className="internal-section">
        <div className="internal-section-header">
          <h2 className="internal-section-title">Service Integration</h2>
          <p className="internal-section-desc">
            Credentials used by internal Caseflow services to authenticate with this instance.
            Do not share these outside of your engineering team.
          </p>
        </div>

        <div className="internal-config-grid">
          <div className="internal-config-row">
            <div className="internal-config-label">Environment</div>
            <div className="internal-config-value">
              <span className="internal-badge internal-badge--prod">production</span>
            </div>
          </div>

          <div className="internal-config-row">
            <div className="internal-config-label">Tenant ID</div>
            <div className="internal-config-value">
              <code className="internal-code">acmecorp</code>
            </div>
          </div>

          <div className="internal-config-row">
            <div className="internal-config-label">API Integration Key</div>
            <div className="internal-config-value">
              <code className="internal-code internal-code--secret">{flag}</code>
              <span className="internal-config-hint">Used by the webhook relay and internal audit service.</span>
            </div>
          </div>

          <div className="internal-config-row">
            <div className="internal-config-label">Webhook Endpoint</div>
            <div className="internal-config-value">
              <code className="internal-code">https://hooks.acmecorp.internal/caseflow</code>
            </div>
          </div>

          <div className="internal-config-row">
            <div className="internal-config-label">Data Region</div>
            <div className="internal-config-value">
              <code className="internal-code">eu-west-1</code>
            </div>
          </div>
        </div>
      </section>

      <section className="internal-section">
        <div className="internal-section-header">
          <h2 className="internal-section-title">Access Control</h2>
          <p className="internal-section-desc">
            This page is restricted to administrators. Integration keys are rotated quarterly.
            Last rotation: <strong>2026-01-15</strong>.
          </p>
        </div>

        <div className="internal-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            If you suspect the integration key has been compromised, contact your platform security team immediately at <strong>security@acmecorp.internal</strong>.
          </span>
        </div>
      </section>
    </div>
  );
}
