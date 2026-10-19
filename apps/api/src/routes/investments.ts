import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { notFound } from '../middleware/errors';
import { summary } from '../services/finance';
import { checkAccount, checkProject, like, paginate } from '../services/records';
import { idParam, investmentSchema, listQuery } from '../validators';

const router = Router();

const columns = (b: z.infer<typeof investmentSchema>) => ({
  name: b.name,
  account_id: b.accountId,
  project_id: b.projectId,
  amount: b.amount,
  description: b.description,
  investment_date: b.date,
});

router.get('/', async (req, res) => {
  const f = listQuery.parse(req.query);
  const query = db('investments as i')
    .join('accounts as a', 'a.id', 'i.account_id')
    .leftJoin('projects as p', 'p.id', 'i.project_id')
    .select('i.*', 'a.name as account_name', 'p.name as project_name')
    .orderBy([
      { column: 'i.investment_date', order: 'desc' },
      { column: 'i.created_at', order: 'desc' },
    ]);
  if (f.from) query.where('i.investment_date', '>=', f.from);
  if (f.to) query.where('i.investment_date', '<=', f.to);
  if (f.projectId) query.where('i.project_id', f.projectId);
  if (f.accountId) query.where('i.account_id', f.accountId);
  if (f.q) query.where((w) => w.whereILike('i.name', like(f.q!)).orWhereILike('i.description', like(f.q!)));
  const [page, totals] = await Promise.all([
    paginate(query, f.page, f.pageSize),
    summary(db, { from: f.from, to: f.to }, f.projectId),
  ]);
  res.json({ ...page, totals });
});

router.post('/', async (req, res) => {
  const body = investmentSchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    await checkAccount(trx, body.accountId, true, 'Funding account');
    await checkProject(trx, body.projectId);
    const [created] = await trx('investments').insert(columns(body)).returning('*');
    return created;
  });
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = investmentSchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    const current = await trx('investments').where({ id }).forUpdate().first();
    if (!current) throw notFound('Investment');
    await checkAccount(trx, body.accountId, current.account_id !== body.accountId, 'Funding account');
    await checkProject(trx, body.projectId);
    const [updated] = await trx('investments')
      .where({ id })
      .update({ ...columns(body), updated_at: trx.fn.now() })
      .returning('*');
    return updated;
  });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (!(await db('investments').where({ id }).delete())) throw notFound('Investment');
  res.status(204).end();
});

export default router;
