import type { ResumeContent, ResumeTheme } from '@folioforge/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  ...timestamps,
});

/** Server-side sessions. `id` is the SHA-256 hash of the cookie token, never the token itself. */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** The whole document as JSON: it is always read and written as one unit. */
    content: jsonb('content').$type<ResumeContent>().notNull(),
    theme: jsonb('theme').$type<ResumeTheme>().notNull(),
    isPublic: boolean('is_public').notNull().default(false),
    viewCount: integer('view_count').notNull().default(0),
    /** Incremented on every save; used for optimistic concurrency control. */
    revision: integer('revision').notNull().default(1),
    ...timestamps,
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('resumes_user_id_idx').on(t.userId, t.updatedAt),
    // At most one public resume per user: it is the one shown at /u/:username.
    uniqueIndex('resumes_one_public_per_user_idx')
      .on(t.userId)
      .where(sql`${t.isPublic} = true`),
  ],
);

export const resumeVersions = pgTable(
  'resume_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    title: text('title').notNull(),
    content: jsonb('content').$type<ResumeContent>().notNull(),
    theme: jsonb('theme').$type<ResumeTheme>().notNull(),
    ...timestamps,
  },
  (t) => [index('resume_versions_resume_id_idx').on(t.resumeId, t.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type ResumeRow = typeof resumes.$inferSelect;
export type ResumeVersionRow = typeof resumeVersions.$inferSelect;
