'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getCsrfToken, csrfHeaders } from '@/lib/csrf';

interface AgentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  role: 'admin' | 'agent';
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AdminUsersView() {
  const [users, setUsers] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'agent' | 'admin'>('agent');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  function fetchUsers() {
    fetch('/api/agent/users', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ email, password, firstName, lastName, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user');
        return;
      }

      setCreateSuccess(`Agent "${firstName} ${lastName}" created successfully.`);
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRole('agent');
      fetchUsers();
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">Manage agent accounts</p>
      </div>

      {/* Users table */}
      <div className="settings-card mb-6">
        <h2 className="settings-section-title mb-4">Agent accounts</h2>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-name">
                      {u.firstName} {u.lastName}
                      {u.nickname && (
                        <span className="admin-user-nick">@{u.nickname}</span>
                      )}
                    </div>
                  </td>
                  <td className="admin-user-email">{u.email}</td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>{u.role}</span>
                  </td>
                  <td className="muted-text text-sm">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create agent form */}
      <div className="settings-card">
        <h2 className="settings-section-title">Create agent</h2>
        <p className="settings-section-desc mb-4">Add a new agent or admin account to the workspace.</p>

        <form onSubmit={handleCreate}>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">First name</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last name</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as 'agent' | 'admin')}
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {createError && <div className="form-error">{createError}</div>}
          {createSuccess && <div className="form-success">{createSuccess}</div>}

          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? 'Creating...' : 'Create agent'}
          </button>
        </form>
      </div>
    </div>
  );
}
