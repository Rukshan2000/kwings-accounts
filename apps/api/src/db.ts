import knexFactory from 'knex';
import pg from 'pg';
import { config } from './config';

// Keep DATE columns as 'YYYY-MM-DD' strings (no timezone shifts). NUMERIC already arrives as a string.
pg.types.setTypeParser(1082, (v) => v);

export const db = knexFactory({
  client: 'pg',
  connection: config.db,
  pool: { min: 0, max: 10 },
});

export type Db = typeof db;
