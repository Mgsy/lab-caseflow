import { sqlite } from './index';

function migrate(): void {
  const tenant = process.env.TENANT ?? 'acmecorp';
  console.log(`Running migrations for tenant: ${tenant}...`);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name    TEXT NOT NULL,
      last_name     TEXT NOT NULL,
      nickname      TEXT,
      avatar_url    TEXT,
      role          TEXT NOT NULL CHECK (role IN ('admin', 'agent', 'customer')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log('  [ok] users table');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      subject           TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'closed')),
      priority          TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      customer_id       INTEGER NOT NULL REFERENCES users(id),
      assigned_agent_id INTEGER REFERENCES users(id),
      tags              TEXT DEFAULT '[]',
      metadata          TEXT DEFAULT '{}',
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at         TEXT
    )
  `);
  console.log('  [ok] tickets table');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id   INTEGER NOT NULL REFERENCES tickets(id),
      sender_id   INTEGER NOT NULL REFERENCES users(id),
      body_html   TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log('  [ok] messages table');

  // Add is_internal column to existing messages tables (migration for pre-existing DBs)
  try {
    sqlite.exec(`ALTER TABLE messages ADD COLUMN is_internal INTEGER NOT NULL DEFAULT 0`);
    console.log('  [ok] messages.is_internal column added');
  } catch {
    // Column already exists — safe to ignore
  }

  console.log('Migrations complete.');
}

migrate();
