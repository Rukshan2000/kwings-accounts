import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Record') => new HttpError(404, `${what} not found`);

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  // Postgres constraint violations that slipped past validation.
  if (err?.code === '23503')
    return res.status(409).json({ error: 'Record is in use or references a missing record' });
  if (err?.code === '23505')
    return res.status(409).json({ error: 'A record with these details already exists' });
  if (err?.code === '23514') return res.status(400).json({ error: 'Value violates a data rule' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  logger.error('Unhandled error', { method: req.method, path: req.path, err: String(err?.stack ?? err) });
  res.status(500).json({ error: 'Internal server error' });
};
