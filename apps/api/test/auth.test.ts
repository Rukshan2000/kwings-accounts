import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, type Client, db, resetDb, startClient } from './helpers';

let api: Client;
before(async () => {
  await resetDb();
  api = await startClient();
});
after(async () => {
  await api.close();
  await db.destroy();
});

test('financial endpoints require authentication', async () => {
  for (const url of ['/api/dashboard', '/api/accounts', '/api/transactions', '/api/reports/income']) {
    assert.equal((await api.get(url)).status, 401, url);
  }
  assert.equal((await api.get('/api/health')).status, 200);
});

test('login rejects a wrong password and accepts the right one', async () => {
  assert.equal((await api.login(ADMIN.email, 'wrong')).status, 401);
  assert.equal((await api.login('nobody@test.local', 'wrong')).status, 401);
  const res = await api.login(ADMIN.email.toUpperCase());
  assert.equal(res.status, 200);
  assert.equal(res.body.email, ADMIN.email);
  assert.equal(res.body.password_hash, undefined);
  assert.equal((await api.get('/api/auth/me')).body.email, ADMIN.email);
});

test('mutations without the CSRF header are rejected', async () => {
  const res = await api.post('/api/accounts', { name: 'Cash', type: 'cash' }, { csrf: false });
  assert.equal(res.status, 403);
  assert.equal((await api.post('/api/accounts', { name: 'Cash', type: 'cash' })).status, 201);
});

test('change password validates the current password', async () => {
  const bad = await api.post('/api/auth/change-password', {
    currentPassword: 'nope',
    newPassword: 'new-password-1',
  });
  assert.equal(bad.status, 400);
  const short = await api.post('/api/auth/change-password', {
    currentPassword: ADMIN.password,
    newPassword: 'x',
  });
  assert.equal(short.status, 400);
  const ok = await api.post('/api/auth/change-password', {
    currentPassword: ADMIN.password,
    newPassword: 'new-password-1',
  });
  assert.equal(ok.status, 204);
  assert.equal((await api.login(ADMIN.email, ADMIN.password)).status, 401);
  assert.equal((await api.login(ADMIN.email, 'new-password-1')).status, 200);
});

test('logout clears the session', async () => {
  assert.equal((await api.post('/api/auth/logout')).status, 204);
  assert.equal((await api.get('/api/auth/me')).status, 401);
});
