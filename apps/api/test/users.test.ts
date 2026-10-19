import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, type Client, db, resetDb, startClient } from './helpers';

let api: Client;
before(async () => {
  await resetDb();
  api = await startClient();
  await api.login();
});
after(async () => {
  await api.close();
  await db.destroy();
});

test('admin can add, edit, reset and delete users', async () => {
  assert.equal(
    (await api.post('/api/users', { name: 'Short', email: 'a@test.local', password: 'short' })).status,
    400,
  );
  const created = await api.post('/api/users', {
    name: 'Accountant',
    email: 'Acc@Test.local',
    password: 'first-password',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.email, 'acc@test.local');
  assert.equal(created.body.password_hash, undefined);
  const dup = await api.post('/api/users', {
    name: 'Dup',
    email: 'acc@test.local',
    password: 'another-password',
  });
  assert.equal(dup.status, 409);

  const id = created.body.id;
  // Blank password keeps the current one.
  assert.equal(
    (await api.put(`/api/users/${id}`, { name: 'Accounts', email: 'acc@test.local', password: '' })).status,
    200,
  );
  const other = await startClient();
  assert.equal((await other.login('acc@test.local', 'first-password')).status, 200);
  assert.equal(
    (
      await api.put(`/api/users/${id}`, {
        name: 'Accounts',
        email: 'acc@test.local',
        password: 'reset-password',
      })
    ).status,
    200,
  );
  assert.equal((await other.login('acc@test.local', 'first-password')).status, 401);
  assert.equal((await other.login('acc@test.local', 'reset-password')).status, 200);

  const list = (await api.get('/api/users')).body;
  assert.deepEqual(list.map((u: { email: string }) => u.email).sort(), ['acc@test.local', ADMIN.email]);

  const me = (await api.get('/api/auth/me')).body;
  assert.equal((await api.del(`/api/users/${me.id}`)).status, 400);
  assert.equal((await api.del(`/api/users/${id}`)).status, 204);
  // Deleted user's existing session stops working immediately.
  assert.equal((await other.get('/api/dashboard')).status, 401);
  await other.close();
});
