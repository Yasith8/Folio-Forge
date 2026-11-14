import type { RequestHandler } from 'express';
import { forbidden } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth. The session cookie is SameSite=Lax, which already
 * blocks cross-site POSTs in modern browsers; this also rejects state-changing
 * requests whose Origin header is not our own.
 */
export function originCheck(allowedOrigins: string[]): RequestHandler {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (!origin) return next(); // Non-browser clients (curl, tests) do not send Origin.
    const ownOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin === ownOrigin || allowedOrigins.includes(origin)) return next();
    throw forbidden('Cross-site request blocked.');
  };
}
