import { Router } from 'express';
import { z } from 'zod';
import { db, type Db } from '../db';
import { notFound } from '../middleware/errors';
import { checkAccount, checkCategory, checkProject, like, paginate } from '../services/records';
import { dueQuery, dueSchema, idParam, paySchema } from '../validators';

const router = Router();

/**
 * Turns every recurring occurrence up to today into a due item. Idempotent: occurrences after
 * `last_date` only, and unique(recurring_id, due_date) absorbs concurrent runs. Dates are
 * start + n × step (not step added repeatedly), so the 31st stays the 31st after a short month.
 */
export async function generateRecurring(knex: Db) {
  // ponytail: caps at 600 occurrences per template (~11 years weekly); raise if start dates go further back.
  await knex.raw(`
    with occ as (
      select r.id, (r.start_date + n * case r.frequency when 'weekly' then interval '1 week'
                                                       when 'monthly' then interval '1 month'
                                                       else interval '1 year' end)::date as d
        from recurring r, generate_series(0, 600) n
       where r.is_active
    ), due as (
      select o.id, o.d from occ o join recurring r on r.id = o.id
       where o.d <= current_date and (r.last_date is null or o.d > r.last_date)
    ), ins as (
      insert into dues (type, account_id, category_id, project_id, amount, description, due_date, recurring_id)
      select r.type, r.account_id, r.category_id, r.project_id, r.amount, r.description, due.d, r.id
        from due join recurring r on r.id = due.id
      on conflict (recurring_id, due_date) do nothing
    )
    update recurring r set last_date = m.d
      from (select id, max(d) as d from due group by id) m
     where r.id = m.id
  `);
}

/** Outstanding totals; overdue = due date before today. */
export async function outstanding(knex: Db) {
  return knex('dues').first(
    ...(['income', 'expense'] as const).flatMap((type) => {
      const name = type === 'income' ? 'receivable' : 'payable';
      return [
        knex.raw(`coalesce(sum(amount) filter (where type = ?), 0)::numeric(18,2) as ${name}`, [type]),
        knex.raw(
          `coalesce(sum(amount) filter (where type = ? and due_date < current_date), 0)::numeric(18,2) as overdue_${name}`,
          [type],
        ),
      ];
    }),
  ) as Promise<{ receivable: string; payable: string; overdue_receivable: string; overdue_payable: string }>;
}

const columns = (b: z.infer<typeof dueSchema>) => ({
  type: b.type,
  account_id: b.accountId,
  category_id: b.categoryId,
  project_id: b.projectId,
  amount: b.amount,
  description: b.description,
  due_date: b.date,
});

async function check(trx: Db, b: z.infer<typeof dueSchema>) {
  if (b.accountId) await checkAccount(trx, b.accountId, false);
  await checkCategory(trx, b.categoryId, b.type);
  await checkProject(trx, b.projectId);
}

router.get('/', async (req, res) => {
  const f = dueQuery.parse(req.query);
  await generateRecurring(db);
  const query = db('dues as d')
    .join('categories as c', 'c.id', 'd.category_id')
    .leftJoin('accounts as a', 'a.id', 'd.account_id')
    .leftJoin('projects as p', 'p.id', 'd.project_id')
    .select('d.*', 'a.name as account_name', 'c.name as category_name', 'p.name as project_name')
    .orderBy([{ column: 'd.due_date' }, { column: 'd.created_at' }]);
  if (f.type) query.where('d.type', f.type);
  if (f.overdue) query.where('d.due_date', '<', db.raw('current_date'));
  if (f.q) {
    const pattern = like(f.q);
    query.where((w) =>
      w.whereILike('d.description', pattern).orWhereILike('c.name', pattern).orWhereILike('p.name', pattern),
    );
  }
  const [page, totals] = await Promise.all([paginate(query, f.page, f.pageSize), outstanding(db)]);
  res.json({ ...page, totals });
});

router.post('/', async (req, res) => {
  const body = dueSchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    await check(trx, body);
    const [created] = await trx('dues').insert(columns(body)).returning('*');
    return created;
  });
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = dueSchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    await check(trx, body);
    const [updated] = await trx('dues')
      .where({ id })
      .update({ ...columns(body), updated_at: trx.fn.now() })
      .returning('*');
    if (!updated) throw notFound('Due item');
    return updated;
  });
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (!(await db('dues').where({ id }).delete())) throw notFound('Due item');
  res.status(204).end();
});

/** Settles a due item: it becomes a real transaction (dated when the money moved) and leaves the list. */
router.post('/:id/pay', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = paySchema.parse(req.body);
  const row = await db.transaction(async (trx) => {
    const due = await trx('dues').where({ id }).forUpdate().first();
    if (!due) throw notFound('Due item');
    await checkAccount(trx, body.accountId, true);
    await checkCategory(trx, due.category_id, due.type);
    const [created] = await trx('transactions')
      .insert({
        type: due.type,
        account_id: body.accountId,
        category_id: due.category_id,
        project_id: due.project_id,
        amount: body.amount,
        description: due.description,
        transaction_date: body.date,
      })
      .returning('*');
    await trx('dues').where({ id }).delete();
    return created;
  });
  res.status(201).json(row);
});

export default router;
