import path from 'node:path';

try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  /* no .env file: env comes from the container */
}

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? '';
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters');

export const config = {
  isProd,
  port: Number(process.env.API_PORT ?? 4000),
  jwtSecret,
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
};
