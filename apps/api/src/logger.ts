type Level = 'info' | 'warn' | 'error';

function log(level: Level, msg: string, extra: Record<string, unknown> = {}) {
  if (level === 'info' && process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra });
  (level === 'error' ? console.error : console.log)(line);
}

export const logger = {
  info: (msg: string, extra?: Record<string, unknown>) => log('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => log('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),
};
