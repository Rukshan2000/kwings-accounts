import './env';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { db } from '../src/db';

export { db };
export const ADMIN = { email: 'admin@test.local', password: 'correct-horse-battery' };

export async function resetDb() {
  await db.migrate.latest({
    directory: path.resolve(__dirname, '../../../packages/db/migrations'),
    loadExtensions: ['.ts'],
  });
  await db.raw(
    'truncate investments, transfers, transactions, projects, categories, accounts, users cascade',
  );
  await db('users').insert({
    name: 'Admin',
    email: ADMIN.email,
    password_hash: await bcrypt.hash(ADMIN.password, 4),
  });
}

export type Client = Awaited<ReturnType<typeof startClient>>;

/** Starts the app on a random port and returns a tiny cookie-aware fetch client. */
export async function startClient() {
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const cookies = new Map<string, string>();

  async function request(method: string, url: string, body?: unknown, opts: { csrf?: boolean } = {}) {
    const headers: Record<string, string> = {
      cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '),
    };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (opts.csrf !== false && cookies.has('ka_csrf')) headers['x-csrf-token'] = cookies.get('ka_csrf')!;
    const res = await fetch(base + url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (v) cookies.set(k, v);
      else cookies.delete(k);
    }
    const text = await res.text();
    const type = res.headers.get('content-type') ?? '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { status: res.status, body: (type.includes('json') ? JSON.parse(text) : text) as any };
  }

  return {
    get: (url: string) => request('GET', url),
    post: (url: string, body?: unknown, opts?: { csrf?: boolean }) => request('POST', url, body ?? {}, opts),
    put: (url: string, body: unknown) => request('PUT', url, body),
    del: (url: string) => request('DELETE', url),
    login: (email = ADMIN.email, password = ADMIN.password) =>
      request('POST', '/api/auth/login', { email, password }),
    close: () => new Promise((r) => server.close(r)),
  };
}
