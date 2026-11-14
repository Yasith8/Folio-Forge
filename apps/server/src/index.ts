import { createApp } from './app';
import { loadConfig, loadDotEnv } from './config';
import { createDatabase } from './db/client';
import { DEMO_USER, seedDemo } from './db/seed';
import { PlaywrightPdfRenderer } from './services/pdf';

loadDotEnv();
const config = loadConfig();
const database = await createDatabase(config.databaseUrl, config.migrationsDir);

if (config.runMigrations) {
  await database.migrate();
  console.log('Database migrations are up to date.');
}
if (config.seedDemo) {
  const { created } = await seedDemo(database.db);
  if (created)
    console.log(`Seeded demo user ${DEMO_USER.email} (password: ${DEMO_USER.password}).`);
}

const pdf = new PlaywrightPdfRenderer({ executablePath: config.chromiumExecutablePath });
const app = createApp({ db: database.db, pdf, config });
const server = app.listen(config.port, () => {
  console.log(`FolioForge API listening on http://localhost:${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down.`);
  server.close();
  await pdf.close().catch(() => undefined);
  await database.close().catch(() => undefined);
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
