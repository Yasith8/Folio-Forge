import { loginInputSchema, signupInputSchema, type PublicUser } from '@folioforge/shared';
import { eq, or } from 'drizzle-orm';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getDummyHash, hashPassword, verifyPassword } from '../auth/password';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
} from '../auth/sessions';
import type { Db } from '../db/client';
import { users } from '../db/schema';
import { HttpError, unauthorized } from '../lib/errors';
import { requireAuth } from '../middleware/session';

interface AuthRouterOptions {
  db: Db;
  cookieSecure: boolean;
  rateLimitPerWindow: number;
}

export function authRouter({ db, cookieSecure, rateLimitPerWindow }: AuthRouterOptions): Router {
  const router = Router();

  // Slows down password guessing: N attempts per IP per 15 minutes.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitPerWindow,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res
        .status(429)
        .json({
          error: {
            code: 'rate_limited',
            message: 'Too many attempts. Wait a few minutes and try again.',
          },
        });
    },
  });

  router.post('/signup', limiter, async (req, res) => {
    const input = signupInputSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const username = input.username.toLowerCase();
    const existing = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)));
    const details = [
      ...(existing.some((u) => u.email === email)
        ? [{ path: 'email', message: 'An account with this email already exists' }]
        : []),
      ...(existing.some((u) => u.username === username)
        ? [{ path: 'username', message: 'This username is taken' }]
        : []),
    ];
    if (details.length)
      throw new HttpError(409, 'account_exists', 'Some details are already in use.', details);

    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        displayName: input.displayName.trim(),
        passwordHash: await hashPassword(input.password),
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
      });
    const session = await createSession(db, user!.id);
    setSessionCookie(res, session.token, session.expiresAt, cookieSecure);
    res.status(201).json({ user });
  });

  router.post('/login', limiter, async (req, res) => {
    const input = loginInputSchema.parse(req.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);
    // Always run a hash comparison so response time does not reveal whether the email exists.
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? (await getDummyHash()),
    );
    if (!user || !valid) throw unauthorized('Email or password is incorrect.');
    const session = await createSession(db, user.id);
    setSessionCookie(res, session.token, session.expiresAt, cookieSecure);
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
    };
    res.json({ user: publicUser });
  });

  router.post('/logout', async (req, res) => {
    if (req.sessionToken) await deleteSession(db, req.sessionToken);
    clearSessionCookie(res, cookieSecure);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
