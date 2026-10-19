import { Router } from 'express';
import type { Knex } from 'knex';
import { z } from 'zod';
import { db } from '../db';
import { notFound } from '../middleware/errors';
import { checkAccount, checkCategory, checkProject, like, paginate } from '../services/records';
import { idParam, listQuery, transactionSchema } from '../validators';

const router = Router();
type Input = z.infer<typeof transactionSchema>;

const columns = (b: Input) => ({
  type: b.type,
  account_id: b.accountId,
  category_id: b.categoryId,
  project_id: b.projectId,
  amount: b.amount,
  description: b.description,
  transaction_date: b.date,
});

function baseQuery() {
  return db('transactions as t')
    .join('accounts as a', 'a.id', 't.account_id')
    .join('categories as c', 'c.id', 't.category_id')
    .leftJoin('projects as p', 'p.id', 't.project_id')
    .select('t.*', 'a.name as account_name', 'c.name as category_name', 'p.name as project_name');
}

/** Shared filter set for the transaction list and the income/expense reports. Dates use transaction_date. */
export function applyFilters(query: Knex.QueryBuilder, f: Partial<z.infer<typeof listQuery>>) {
  if (f.type) query.where('t.type', f.type);
  if (f.from) query.where('t.transaction_date', '>=', f.from);
  if (f.to) query.where('t.transaction_date', '<=', f.to);
  if (f.accountId) query.where('t.account_id', f.accountId);
  if (f.categoryId) query.where('t.category_id', f.categoryId);
  if (f.projectId) query.where('t.project_id', f.projectId);
  if (f.q) {
    const pattern = like(f.q);
    query.where((w) =>
      w
        .whereILike('t.description', pattern)
        .orWhereILike('c.name', pattern)
        .orWhereILike('p.name', pattern)
        .orWhereILike('a.name', pattern),
    );
  }
  return query;
}

export function transactionsQuery(f: Partial<z.infer<typeof listQuery>>) {
  return applyFilters(baseQuery(), f).orderBy([
    { column: 't.transaction_date', order: 'desc' },
    { column: 't.created_at', order: 'desc' },
  ]);
}

router.get('/', async (req, res) => {
  const f = listQuery.parse(req.query);
  const totals = await applyFilters(
    db('transactions as t')
      .join('accounts as a', 'a.id', 't.account_id')
      .join('categories as c', 'c.id', 't.category_id')
      .leftJoin('projects as p', 'p.id', 't.project_id'),
    f,
  ).first(
    db.raw(`coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric(18,2) as income`),
    db.raw(`coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric(18,2) as expenses`),
  );
  res.json({ ...(await paginate(transactionsQuery(f), f.page, f.pageSize)), totals });
});

router.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const row = await baseQuery().where('t.id', id).first();
  if (!row) throw notFound('Transaction');
  res.json(row);
});

router.post('/', async (req, res) => {
  const body = transactionSchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    await checkAccount(trx, body.accountId, true);
    await checkCategory(trx, body.categoryId, body.type);
    await checkProject(trx, body.projectId);
    const [created] = await trx('transactions').insert(columns(body)).returning('*');
    return created;
  });
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = transactionSchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    const current = await trx('transactions').where({ id }).forUpdate().first();
    if (!current) throw notFound('Transaction');
    await checkAccount(trx, body.accountId, current.account_id !== body.accountId);
    await checkCategory(trx, body.categoryId, body.type);
    await checkProject(trx, body.projectId);
    const [updated] = await trx('transactions')
      .where({ id })
      .update({ ...columns(body), updated_at: trx.fn.now() })
      .returning('*');
    return updated;
  });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (!(await db('transactions').where({ id }).delete())) throw notFound('Transaction');
  res.status(204).end();
});

export default router;
