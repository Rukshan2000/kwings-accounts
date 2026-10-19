import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { HttpError, notFound } from '../middleware/errors';
import { idParam, newUserSchema, userSchema } from '../validators';

// Every user has full access (no roles): this only manages who can log in.
const router = Router();
const columns = ['id', 'name', 'email', 'created_at', 'updated_at'];

router.get('/', async (_req, res) => {
  res.json(await db('users').select(columns).orderBy('created_at'));
});

router.post('/', async (req, res) => {
  const { name, email, password } = newUserSchema.parse(req.body);
  const [row] = await db('users')
    .insert({ name, email, password_hash: await bcrypt.hash(password, 12) })
    .returning(columns);
  res.status(201).json(row);
});

/** Edit name/email; a non-empty password also resets that user's password. */
router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { name, email, password } = userSchema.parse(req.body);
  const changes: Record<string, unknown> = { name, email, updated_at: db.fn.now() };
  if (password) changes.password_hash = await bcrypt.hash(password, 12);
  const [row] = await db('users').where({ id }).update(changes).returning(columns);
  if (!row) throw notFound('User');
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (id === req.userId) throw new HttpError(400, 'You cannot delete your own account');
  if (!(await db('users').where({ id }).delete())) throw notFound('User');
  res.status(204).end();
});

export default router;
