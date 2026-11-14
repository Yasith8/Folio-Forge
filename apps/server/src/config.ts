import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const booleanFlag = (fallback: boolean) =>
  z.preprocess(
    emptyToUndefined,
    z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1')),
  );

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see .env.example)'),
  PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().default('http://localhost:3000')),
  ALLOWED_ORIGINS: z.string().default(''),
  COOKIE_SECURE: booleanFlag(false),
  RUN_MIGRATIONS: booleanFlag(true),
  SEED_DEMO: booleanFlag(false),
  WEB_DIST_DIR: optionalString,
  CHROMIUM_EXECUTABLE_PATH: optionalString,
  MIGRATIONS_DIR: optionalString,
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(30),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  publicUrl: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  runMigrations: boolean;
  seedDemo: boolean;
  webDistDir?: string;
  chromiumExecutablePath?: string;
  migrationsDir?: string;
  authRateLimit: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const e = result.data;
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    publicUrl: e.PUBLIC_URL.replace(/\/$/, ''),
    allowedOrigins: e.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    cookieSecure: e.COOKIE_SECURE,
    runMigrations: e.RUN_MIGRATIONS,
    seedDemo: e.SEED_DEMO,
    webDistDir: e.WEB_DIST_DIR,
    chromiumExecutablePath: e.CHROMIUM_EXECUTABLE_PATH,
    migrationsDir: e.MIGRATIONS_DIR,
    authRateLimit: e.AUTH_RATE_LIMIT,
  };
}

/** Loads `.env` from the working directory or the repo root, if present (Node 20.12+). */
export function loadDotEnv(): void {
  for (const file of ['.env', '../../.env']) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      // File not found: try the next location.
    }
  }
}
