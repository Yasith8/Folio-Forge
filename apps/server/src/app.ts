import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config';
import type { Db } from './db/client';
import { errorHandler, notFound } from './lib/errors';
import { originCheck } from './middleware/originCheck';
import { requireAuth, sessionMiddleware } from './middleware/session';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { resumesRouter } from './routes/resumes';
import type { PdfRenderer } from './services/pdf';

export interface AppDependencies {
  db: Db;
  pdf: PdfRenderer;
  config: Pick<
    AppConfig,
    'publicUrl' | 'allowedOrigins' | 'cookieSecure' | 'webDistDir' | 'authRateLimit' | 'nodeEnv'
  >;
}

/** Builds the Express app. Dependencies are injected so tests can use an in-memory database and a fake PDF renderer. */
export function createApp({ db, pdf, config }: AppDependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(sessionMiddleware(db, config.cookieSecure));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    '/api',
    originCheck([config.publicUrl, ...config.allowedOrigins].map((u) => new URL(u).origin)),
  );
  app.use(
    '/api/auth',
    authRouter({ db, cookieSecure: config.cookieSecure, rateLimitPerWindow: config.authRateLimit }),
  );
  app.use('/api/resumes', requireAuth, resumesRouter({ db, pdf }));
  app.use('/api', () => {
    throw notFound('API route not found.');
  });
  app.use('/u', publicRouter({ db, publicUrl: config.publicUrl }));

  // In production the API also serves the built single-page app.
  const webDist = config.webDistDir ? path.resolve(config.webDistDir) : undefined;
  if (webDist && existsSync(path.join(webDist, 'index.html'))) {
    app.use(
      '/assets',
      express.static(path.join(webDist, 'assets'), {
        immutable: true,
        maxAge: '1y',
        fallthrough: false,
      }),
    );
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache').sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
