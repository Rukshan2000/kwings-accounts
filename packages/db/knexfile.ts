import path from 'node:path';
import type { Knex } from 'knex';

// Local dev: read the repo-root .env (run from packages/db or apps/api). Docker passes real env vars.
try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  /* no .env file */
}

// Migrations may run as a separate owner role; the app runs as a least-privilege role.
const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_DATABASE,
    user: process.env.MIGRATION_DB_USERNAME || process.env.DB_USERNAME,
    password: process.env.MIGRATION_DB_PASSWORD || process.env.DB_PASSWORD,
  },
  pool: { min: 0, max: 2 },
  migrations: { directory: path.join(__dirname, 'migrations'), loadExtensions: ['.ts', '.js'] },
  seeds: { directory: path.join(__dirname, 'seeds'), loadExtensions: ['.ts', '.js'] },
};

export default config;
