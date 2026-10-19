import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { HttpError, notFound } from '../middleware/errors';
import { projectStats } from '../services/finance';
import { idParam, projectSchema, rangeQuery } from '../validators';

const router = Router();

const columns = (b: z.infer<typeof projectSchema>) => ({
  name: b.name,
  client_name: b.clientName,
  description: b.description,
  status: b.status,
  start_date: b.startDate,
});

router.get('/', async (req, res) => {
  res.json(await projectStats(db, rangeQuery.parse(req.query)));
});

router.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const [project] = await projectStats(db, rangeQuery.parse(req.query), id);
  if (!project) throw notFound('Project');
  res.json(project);
});

router.post('/', async (req, res) => {
  const [row] = await db('projects')
    .insert(columns(projectSchema.parse(req.body)))
    .returning('*');
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const [row] = await db('projects')
    .where({ id })
    .update({ ...columns(projectSchema.parse(req.body)), updated_at: db.fn.now() })
    .returning('*');
  if (!row) throw notFound('Project');
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const linked =
    (await db('transactions').where({ project_id: id }).first('id')) ||
    (await db('investments').where({ project_id: id }).first('id'));
  if (linked)
    throw new HttpError(409, 'This project has linked transactions or investments and cannot be deleted');
  if (!(await db('projects').where({ id }).delete())) throw notFound('Project');
  res.status(204).end();
});

export default router;
