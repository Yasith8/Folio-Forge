import { createHash, randomBytes } from 'node:crypto';
import type { PublicUser } from '@folioforge/shared';
import { eq } from 'drizzle-orm';
import type { CookieOptions, Response } from 'express';
import type { Db } from '../db/client';
import { sessions, users } from '../db/schema';

export const SESSION_COOKIE = 'ff_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_WHEN_LESS_THAN_MS = 15 * 24 * 60 * 60 * 1000;

/** Only the hash is stored, so a leaked database cannot be used to hijack sessions. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(
  db: Db,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export interface ValidatedSession {
  user: PublicUser;
  expiresAt: Date;
  renewed: boolean;
}

export async function validateSession(db: Db, token: string): Promise<ValidatedSession | null> {
  const id = hashToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  if (!row) return null;
  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  // Sliding expiration: active users stay signed in, idle sessions expire.
  if (row.expiresAt.getTime() - now < RENEW_WHEN_LESS_THAN_MS) {
    const expiresAt = new Date(now + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    return { user: row.user, expiresAt, renewed: true };
  }
  return { user: row.user, expiresAt: row.expiresAt, renewed: false };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  secure: boolean,
): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(secure), expires: expiresAt });
}

export function clearSessionCookie(res: Response, secure: boolean): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
}
