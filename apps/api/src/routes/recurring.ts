import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { notFound } from '../middleware/errors';
import { checkAccount, checkCategory, checkProject } from '../services/records';
import { idParam, recurringSchema } from '../validators';

const router = Router();

const columns = (b: z.infer<typeof recurringSchema>) => ({
  type: b.type,
  account_id: b.accountId,
  category_id: b.categoryId,
  project_id: b.projectId,
  amount: b.amount,
  description: b.description,
  frequency: b.frequency,
  start_date: b.startDate,
  is_active: b.isActive,
});

async function save(id: string | null, b: z.infer<typeof recurringSchema>) {
  return db.transaction(async (trx) => {
    if (b.accountId) await checkAccount(trx, b.accountId, false);
    await checkCategory(trx, b.categoryId, b.type);
    await checkProject(trx, b.projectId);
    if (!id) return (await trx('recurring').insert(columns(b)).returning('*'))[0];
    const [row] = await trx('recurring')
      .where({ id })
      .update({ ...columns(b), updated_at: trx.fn.now() })
      .returning('*');
    if (!row) throw notFound('Recurring item');
    return row;
  });
}

router.get('/', async (_req, res) => {
  res.json(
    await db('recurring as r')
      .join('categories as c', 'c.id', 'r.category_id')
      .leftJoin('accounts as a', 'a.id', 'r.account_id')
      .leftJoin('projects as p', 'p.id', 'r.project_id')
      .select('r.*', 'a.name as account_name', 'c.name as category_name', 'p.name as project_name')
      .orderBy([{ column: 'r.is_active', order: 'desc' }, { column: 'r.start_date' }]),
  );
});

router.post('/', async (req, res) => {
  res.status(201).json(await save(null, recurringSchema.parse(req.body)));
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await save(id, recurringSchema.parse(req.body)));
});

/** Already generated due items stay (unlinked); only future occurrences stop. */
router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (!(await db('recurring').where({ id }).delete())) throw notFound('Recurring item');
  res.status(204).end();
});

export default router;
