import type { RequestHandler } from 'express';
import { SESSION_COOKIE, setSessionCookie, validateSession } from '../auth/sessions';
import type { Db } from '../db/client';
import { unauthorized } from '../lib/errors';

/** Attaches `req.user` when the request carries a valid session cookie. */
export function sessionMiddleware(db: Db, cookieSecure: boolean): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) return next();
    const session = await validateSession(db, token);
    if (session) {
      req.user = session.user;
      req.sessionToken = token;
      if (session.renewed) setSessionCookie(res, token, session.expiresAt, cookieSecure);
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
};
