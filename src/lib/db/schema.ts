import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['admin', 'agent', 'customer'] }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subject: text('subject').notNull(),
  status: text('status', { enum: ['new', 'open', 'closed'] }).notNull().default('new'),
  priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] }).default('normal'),
  customerId: integer('customer_id').notNull().references(() => users.id),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id),
  tags: text('tags').default('[]'),
  metadata: text('metadata').default('{}'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  closedAt: text('closed_at'),
});

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id),
  senderId: integer('sender_id').notNull().references(() => users.id),
  bodyHtml: text('body_html').notNull(),
  isInternal: integer('is_internal').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
