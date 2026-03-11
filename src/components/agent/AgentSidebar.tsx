'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCsrfToken } from '@/lib/csrf';

interface AgentSidebarProps {
  userId: number;
  role: 'admin' | 'agent' | 'customer';
}

interface AgentProfile {
  firstName: string;
  lastName: string;
  nickname?: string;
  avatarUrl?: string;
  role: string;
}

export function AgentSidebar({ userId, role }: AgentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AgentProfile | null>(null);

  useEffect(() => {
    fetch('/api/agent/me', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setProfile(data.user);
      })
      .catch(() => {});
  }, [userId]);

  async function handleLogout() {
    await fetch('/api/agent/auth/logout', { method: 'POST' });
    router.push('/agent/login');
  }

  function isActive(prefixes: string[]) {
    return prefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    );
  }

  const navItems = [
    {
      href: '/agent/dashboard',
      label: 'Tickets',
      matchPrefixes: ['/agent/dashboard', '/agent/tickets'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
      ),
    },
    {
      href: '/agent/settings',
      label: 'Settings',
      matchPrefixes: ['/agent/settings'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  if (role === 'admin') {
    navItems.push({
      href: '/agent/admin/users',
      label: 'Users',
      matchPrefixes: ['/agent/admin/users'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    });
    navItems.push({
      href: '/agent/admin/internal',
      label: 'Internal',
      matchPrefixes: ['/agent/admin/internal'],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    });
  }

  const initials = profile
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : '?';

  return (
    <aside className="agent-sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-mark">CF</span>
        <span className="sidebar-logo-text">Caseflow</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${isActive(item.matchPrefixes) ? 'active' : ''} ${item.href === '/agent/admin/users' ? 'sidebar-nav-item--admin-section' : ''} ${item.href === '/agent/admin/internal' ? 'sidebar-nav-item--admin-sub' : ''}`}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">
              {profile ? `${profile.firstName} ${profile.lastName}` : '...'}
            </span>
            <span className="sidebar-user-role">{role}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
