import path from 'node:path';

try {
  process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
} catch {
  /* CI provides env vars */
}
const testDb = process.env.TEST_DB_DATABASE ?? process.env.DB_DATABASE;
// Tests truncate every table: never point them at a real database.
if (!testDb?.includes('test'))
  throw new Error('Refusing to run: TEST_DB_DATABASE must name a *test* database');
process.env.DB_DATABASE = testDb;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
