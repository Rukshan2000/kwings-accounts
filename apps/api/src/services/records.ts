import type { Knex } from 'knex';
import { HttpError, notFound } from '../middleware/errors';

export async function paginate<T>(query: Knex.QueryBuilder, page: number, pageSize: number) {
  const countQuery = query.clone().clearSelect().clearOrder().count<{ count: string }[]>('* as count');
  const [rows, [{ count }]] = await Promise.all([
    query.limit(pageSize).offset((page - 1) * pageSize),
    countQuery,
  ]);
  return { data: rows as T[], total: Number(count), page, pageSize };
}

/** ILIKE pattern with user wildcards escaped. */
export const like = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

/** New money can only move through active accounts; existing records may keep an archived one. */
export async function checkAccount(db: Knex, id: string, mustBeActive: boolean, label = 'Account') {
  const account = await db('accounts').where({ id }).first('id', 'is_active');
  if (!account) throw new HttpError(400, `${label} does not exist`);
  if (mustBeActive && !account.is_active) throw new HttpError(400, `${label} is archived`);
}

export async function checkCategory(db: Knex, id: string, type: 'income' | 'expense') {
  const category = await db('categories').where({ id }).first('type');
  if (!category) throw new HttpError(400, 'Category does not exist');
  if (category.type !== type) throw new HttpError(400, `Category is not an ${type} category`);
}

export async function checkProject(db: Knex, id: string | null | undefined) {
  if (id && !(await db('projects').where({ id }).first('id')))
    throw new HttpError(400, 'Project does not exist');
}

export async function findOr404<T = Record<string, unknown>>(
  db: Knex,
  table: string,
  id: string,
  what: string,
) {
  const row = await db(table).where({ id }).first();
  if (!row) throw notFound(what);
  return row as T;
}
