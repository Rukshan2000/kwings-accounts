import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { HttpError, notFound } from '../middleware/errors';
import { categorySchema, idParam } from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  const { type } = z.object({ type: z.enum(['income', 'expense']).optional() }).parse(req.query);
  const query = db('categories as c')
    .select(
      'c.*',
      db.raw('(select count(*)::int from transactions t where t.category_id = c.id) as usage_count'),
    )
    .orderBy(['c.type', 'c.name']);
  if (type) query.where('c.type', type);
  res.json(await query);
});

router.post('/', async (req, res) => {
  const body = categorySchema.parse(req.body);
  const [row] = await db('categories').insert(body).returning('*');
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = categorySchema.parse(req.body);
  const current = await db('categories').where({ id }).first();
  if (!current) throw notFound('Category');
  if (current.type !== body.type && (await db('transactions').where({ category_id: id }).first('id'))) {
    throw new HttpError(409, 'Cannot change the type of a category that is in use');
  }
  const [row] = await db('categories')
    .where({ id })
    .update({ ...body, updated_at: db.fn.now() })
    .returning('*');
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (await db('transactions').where({ category_id: id }).first('id')) {
    throw new HttpError(409, 'This category is used by transactions and cannot be deleted');
  }
  const deleted = await db('categories').where({ id }).delete();
  if (!deleted) throw notFound('Category');
  res.status(204).end();
});

export default router;
