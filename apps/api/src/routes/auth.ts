import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { endSession, rateLimit, requireAuth, requireCsrf, startSession } from '../middleware/auth';
import { HttpError } from '../middleware/errors';
import { changePasswordSchema, loginSchema } from '../validators';

const router = Router();
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await db('users').where({ email }).first();
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Invalid email or password');
  startSession(res, user.id);
  res.json({ id: user.id, name: user.name, email: user.email });
});

router.post('/logout', (_req, res) => {
  endSession(res);
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  res.json(await db('users').where({ id: req.userId }).first('id', 'name', 'email'));
});

router.post('/change-password', requireAuth, requireCsrf, async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const user = await db('users').where({ id: req.userId }).first();
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  await db('users')
    .where({ id: user.id })
    .update({ password_hash: await bcrypt.hash(newPassword, 12), updated_at: db.fn.now() });
  res.status(204).end();
});

export default router;
