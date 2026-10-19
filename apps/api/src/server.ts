import { config } from './config';
import { createApp } from './app';
import { db } from './db';
import { logger } from './logger';

const server = createApp().listen(config.port, () => logger.info('API listening', { port: config.port }));

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info('Shutting down', { signal });
    server.close(() => db.destroy().finally(() => process.exit(0)));
  });
}
