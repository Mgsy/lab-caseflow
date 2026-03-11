'use client';

import { useState, useEffect, FormEvent } from 'react';
import { getCsrfToken, csrfHeaders } from '@/lib/csrf';

interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatarUrl?: string;
}

export function CustomerSettingsForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customer/me', {
      headers: { 'X-Caseflow-Csrf-Token': getCsrfToken() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const u = data.user;
          setProfile(u);
          setFirstName(u.firstName || '');
          setLastName(u.lastName || '');
          setEmail(u.email || '');
        }
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);

    const body: Record<string, string> = {
      firstName,
      lastName,
      email,
    };

    if (newPassword) {
      body.password = newPassword;
    }

    try {
      const res = await fetch('/api/customer/me', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save changes');
        return;
      }

      if (data.user) setProfile(data.user);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="page-container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
        <p className="page-subtitle">Manage your profile and password</p>
      </div>

      <div className="settings-card">
        <form onSubmit={handleSubmit}>
          <div className="settings-section">
            <h2 className="settings-section-title">Profile</h2>

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
          </div>

          <div className="settings-divider" />

          <div className="settings-section">
            <h2 className="settings-section-title">Change password</h2>
            <p className="settings-section-desc">Leave blank to keep your current password.</p>

            <div className="form-group">
              <label className="form-label">New password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">Changes saved successfully.</div>}

          <div className="settings-actions">
            <div />
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
