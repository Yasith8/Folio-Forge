import { loadConfig, loadDotEnv } from '../config';
import { createDatabase } from './client';

loadDotEnv();
const config = loadConfig();
const database = await createDatabase(config.databaseUrl, config.migrationsDir);
await database.migrate();
await database.close();
console.log('Migrations applied.');
