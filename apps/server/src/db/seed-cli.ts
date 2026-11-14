import { loadConfig, loadDotEnv } from '../config';
import { createDatabase } from './client';
import { DEMO_USER, seedDemo } from './seed';

loadDotEnv();
const config = loadConfig();
const database = await createDatabase(config.databaseUrl, config.migrationsDir);
await database.migrate();
const { created } = await seedDemo(database.db);
await database.close();
console.log(
  created
    ? `Demo user created: ${DEMO_USER.email} / ${DEMO_USER.password}`
    : 'Demo user already exists.',
);
