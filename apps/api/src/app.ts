import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { db } from './db';
import { logger } from './logger';
import { requireAuth, requireCsrf } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errors';
import accounts from './routes/accounts';
import auth from './routes/auth';
import categories from './routes/categories';
import dashboard from './routes/dashboard';
import investments from './routes/investments';
import projects from './routes/projects';
import reports from './routes/reports';
import transactions from './routes/transactions';
import transfers from './routes/transfers';
import users from './routes/users';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Nginx / the Next.js proxy: use X-Forwarded-For for rate limiting
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const path = req.originalUrl.split('?')[0];
      if (path === '/api/health') return;
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info('request', { method: req.method, path, status: res.statusCode, ms: Math.round(ms) });
    });
    next();
  });

  app.get('/api/health', async (_req, res) => {
    await db.raw('select 1');
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', auth);
  // Everything below handles financial data: authenticated + CSRF-protected.
  app.use('/api', requireAuth, requireCsrf);
  app.use('/api/dashboard', dashboard);
  app.use('/api/accounts', accounts);
  app.use('/api/categories', categories);
  app.use('/api/transactions', transactions);
  app.use('/api/transfers', transfers);
  app.use('/api/projects', projects);
  app.use('/api/investments', investments);
  app.use('/api/reports', reports);
  app.use('/api/users', users);
  app.use('/api', () => {
    throw notFound('Endpoint');
  });

  app.use(errorHandler);
  return app;
}
