import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from './schema';

const KNOWN_TENANTS = ['acmecorp', 'attacker'] as const;
type Tenant = (typeof KNOWN_TENANTS)[number];

interface TenantConnection {
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle>;
}

const connectionCache = new Map<string, TenantConnection>();

export function getDb(tenant: string): TenantConnection {
  if (connectionCache.has(tenant)) {
    return connectionCache.get(tenant)!;
  }

  const dbPath = path.join(process.cwd(), 'data', `${tenant}.db`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  const conn: TenantConnection = { sqlite, db };
  connectionCache.set(tenant, conn);
  return conn;
}

// Backward-compat exports for CLI scripts (migrate.ts, seed.ts).
// These are lazy proxies — the connection is only opened when a property
// is first accessed, so importing this module during next build does not
// open any database file.
function getCliTenant(): string {
  const t = process.env.TENANT;
  if (t && KNOWN_TENANTS.includes(t as Tenant)) {
    return t;
  }
  return 'acmecorp';
}

function getCliConn(): TenantConnection {
  return getDb(getCliTenant());
}

// Proxy that forwards property access to the lazily-resolved connection
export const sqlite: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const conn = getCliConn();
    const value = (conn.sqlite as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(conn.sqlite);
    }
    return value;
  },
  set(_target, prop, value) {
    const conn = getCliConn();
    (conn.sqlite as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
});

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const conn = getCliConn();
    const value = (conn.db as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(conn.db);
    }
    return value;
  },
});
