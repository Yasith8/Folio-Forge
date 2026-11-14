import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Schema = typeof schema;
/** Driver-agnostic database handle: works with node-postgres (production) and PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export interface Database {
  db: Db;
  migrate(): Promise<void>;
  close(): Promise<void>;
}

/** Finds the generated SQL migrations both from source (tsx) and from the bundled build. */
export function resolveMigrationsDir(explicit?: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    explicit,
    path.resolve(here, '../drizzle'),
    path.resolve(here, '../../drizzle'),
  ].filter((c): c is string => Boolean(c));
  const found = candidates.find((dir) => existsSync(path.join(dir, 'meta', '_journal.json')));
  if (!found)
    throw new Error(`Could not find database migrations. Looked in: ${candidates.join(', ')}`);
  return found;
}

/**
 * Connects to Postgres. `pglite:memory` or `pglite:<dir>` start an embedded
 * Postgres (WASM) instead, which tests and the e2e suite use so they need no
 * external database.
 */
export async function createDatabase(url: string, migrationsDir?: string): Promise<Database> {
  const migrationsFolder = () => resolveMigrationsDir(migrationsDir);

  if (url.startsWith('pglite:')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const location = url.slice('pglite:'.length);
    const client = location === 'memory' || location === '' ? new PGlite() : new PGlite(location);
    const db = drizzle({ client, schema });
    return {
      db: db as unknown as Db,
      migrate: () => migrate(db, { migrationsFolder: migrationsFolder() }),
      close: () => client.close(),
    };
  }

  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new pg.default.Pool({ connectionString: url, max: 10 });
  const db = drizzle({ client: pool, schema });
  return {
    db: db as unknown as Db,
    migrate: () => migrate(db, { migrationsFolder: migrationsFolder() }),
    close: () => pool.end(),
  };
}
