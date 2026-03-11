'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/csrf';

interface CustomerProfile {
  firstName: string;
  lastName: string;
}

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    fetch('/api/customer/me', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setProfile(data.user);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/customer/auth/logout', { method: 'POST' });
    router.push('/customer/login');
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <header className="customer-topnav">
      <div className="customer-topnav-inner">
        {/* Logo */}
        <Link href="/customer/dashboard" className="customer-nav-logo">
          <span className="customer-logo-mark">CF</span>
          <span className="customer-logo-text">Caseflow</span>
        </Link>

        {/* Nav links */}
        <nav className="customer-nav-links">
          <Link
            href="/customer/dashboard"
            className={`customer-nav-link ${isActive('/customer/dashboard') || isActive('/customer/tickets') ? 'active' : ''}`}
          >
            My Tickets
          </Link>
        </nav>

        {/* Right side */}
        <div className="customer-nav-right">
          {profile && (
            <span className="customer-nav-user">
              {profile.firstName} {profile.lastName}
            </span>
          )}
          <Link
            href="/customer/settings"
            className={`customer-nav-link ${isActive('/customer/settings') ? 'active' : ''}`}
          >
            Settings
          </Link>
          <button className="customer-nav-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
