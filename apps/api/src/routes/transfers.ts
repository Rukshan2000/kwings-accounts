import { Router } from 'express';
import { db } from '../db';
import { notFound } from '../middleware/errors';
import { checkAccount, like, paginate } from '../services/records';
import { idParam, listQuery, transferSchema } from '../validators';

const router = Router();

function baseQuery() {
  return db('transfers as tr')
    .join('accounts as fa', 'fa.id', 'tr.from_account_id')
    .join('accounts as ta', 'ta.id', 'tr.to_account_id')
    .select('tr.*', 'fa.name as from_account_name', 'ta.name as to_account_name');
}

router.get('/', async (req, res) => {
  const f = listQuery.parse(req.query);
  const query = baseQuery().orderBy([
    { column: 'tr.transfer_date', order: 'desc' },
    { column: 'tr.created_at', order: 'desc' },
  ]);
  if (f.from) query.where('tr.transfer_date', '>=', f.from);
  if (f.to) query.where('tr.transfer_date', '<=', f.to);
  if (f.accountId)
    query.where((w) => w.where('tr.from_account_id', f.accountId).orWhere('tr.to_account_id', f.accountId));
  if (f.q) query.whereILike('tr.description', like(f.q));
  res.json(await paginate(query, f.page, f.pageSize));
});

/** Idempotent: repeating a request with the same idempotencyKey returns the original transfer (200). */
router.post('/', async (req, res) => {
  const body = transferSchema.parse(req.body);
  const { row, created } = await db.transaction(async (trx) => {
    await checkAccount(trx, body.fromAccountId, true, 'Source account');
    await checkAccount(trx, body.toAccountId, true, 'Destination account');
    const [inserted] = await trx('transfers')
      .insert({
        from_account_id: body.fromAccountId,
        to_account_id: body.toAccountId,
        amount: body.amount,
        description: body.description,
        transfer_date: body.date,
        idempotency_key: body.idempotencyKey,
      })
      .onConflict('idempotency_key')
      .ignore()
      .returning('*');
    if (inserted) return { row: inserted, created: true };
    return {
      row: await trx('transfers').where({ idempotency_key: body.idempotencyKey }).first(),
      created: false,
    };
  });
  res.status(created ? 201 : 200).json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (!(await db('transfers').where({ id }).delete())) throw notFound('Transfer');
  res.status(204).end();
});

export default router;
