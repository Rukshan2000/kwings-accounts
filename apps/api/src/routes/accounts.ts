import { Router } from 'express';
import { db } from '../db';
import { HttpError, notFound } from '../middleware/errors';
import { accountBalances, totalBalance } from '../services/finance';
import { findOr404, paginate } from '../services/records';
import { accountSchema, idParam, listQuery } from '../validators';

const router = Router();

router.get('/', async (_req, res) => {
  res.json(await accountBalances(db));
});

router.get('/total', async (_req, res) => {
  res.json({ total: await totalBalance(db) });
});

router.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const [account] = await accountBalances(db, {}, id);
  if (!account) throw notFound('Account');
  res.json(account);
});

/** Every movement on the account, newest first, with a signed amount. */
router.get('/:id/history', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { page, pageSize } = listQuery.parse(req.query);
  await findOr404(db, 'accounts', id, 'Account');
  const history = db
    .select('*')
    .from(
      db.raw(
        `(
        select t.id, t.type as kind, t.transaction_date as date, t.description, c.name as label,
               case when t.type = 'income' then t.amount else -t.amount end as amount, t.created_at
          from transactions t join categories c on c.id = t.category_id where t.account_id = :id
        union all
        select tr.id, 'transfer_in', tr.transfer_date, tr.description, 'From ' || a.name, tr.amount, tr.created_at
          from transfers tr join accounts a on a.id = tr.from_account_id where tr.to_account_id = :id
        union all
        select tr.id, 'transfer_out', tr.transfer_date, tr.description, 'To ' || a.name, -tr.amount, tr.created_at
          from transfers tr join accounts a on a.id = tr.to_account_id where tr.from_account_id = :id
        union all
        select i.id, 'investment', i.investment_date, i.description, i.name, -i.amount, i.created_at
          from investments i where i.account_id = :id
      ) as h`,
        { id },
      ),
    )
    .orderBy([
      { column: 'date', order: 'desc' },
      { column: 'created_at', order: 'desc' },
    ]);
  res.json(await paginate(history, page, pageSize));
});

router.post('/', async (req, res) => {
  const body = accountSchema.parse(req.body);
  const [row] = await db('accounts')
    .insert({
      name: body.name,
      type: body.type,
      opening_balance: body.openingBalance,
      is_active: body.isActive,
    })
    .returning('*');
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = accountSchema.parse(req.body);
  const [row] = await db('accounts')
    .where({ id })
    .update({
      name: body.name,
      type: body.type,
      opening_balance: body.openingBalance,
      is_active: body.isActive,
      updated_at: db.fn.now(),
    })
    .returning('*');
  if (!row) throw notFound('Account');
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await findOr404(db, 'accounts', id, 'Account');
  const { rows } = await db.raw(
    `select exists(select 1 from transactions where account_id = :id)
         or exists(select 1 from transfers where from_account_id = :id or to_account_id = :id)
         or exists(select 1 from investments where account_id = :id) as used`,
    { id },
  );
  if (rows[0].used) throw new HttpError(409, 'This account has records. Archive it instead of deleting.');
  await db('accounts').where({ id }).delete();
  res.status(204).end();
});

export default router;
