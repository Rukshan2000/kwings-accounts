import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { type Client, db, resetDb, startClient } from './helpers';

let api: Client;
const ids: Record<string, string> = {};

async function create(url: string, body: unknown) {
  const res = await api.post(url, body);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.id as string;
}
const balance = async (id: string) => (await api.get(`/api/accounts/${id}`)).body.balance;

before(async () => {
  await resetDb();
  api = await startClient();
  await api.login();
  ids.bank = await create('/api/accounts', { name: 'Bank', type: 'bank', openingBalance: '100.00' });
  ids.web = await create('/api/categories', { name: 'Web', type: 'income' });
  ids.hosting = await create('/api/categories', { name: 'Hosting', type: 'expense' });
});
after(async () => {
  await api.close();
  await db.destroy();
});

test('dues do not touch balances or profit until paid', async () => {
  ids.receivable = await create('/api/dues', {
    type: 'income',
    categoryId: ids.web,
    amount: '5000.00',
    date: '2000-01-01', // overdue
    description: 'Acme invoice',
  });
  await create('/api/dues', {
    type: 'expense',
    accountId: ids.bank,
    categoryId: ids.hosting,
    amount: '300.50',
    date: '2999-01-01',
  });
  assert.equal(await balance(ids.bank), '100.00');
  assert.equal((await api.get('/api/dashboard')).body.totals.income, '0.00');

  const list = await api.get('/api/dues');
  assert.deepEqual(list.body.totals, {
    receivable: '5000.00',
    payable: '300.50',
    overdue_receivable: '5000.00',
    overdue_payable: '0.00',
  });
  assert.equal((await api.get('/api/dues?overdue=true')).body.total, 1);
  // category type must match
  assert.equal(
    (
      await api.post('/api/dues', {
        type: 'income',
        categoryId: ids.hosting,
        amount: '1',
        date: '2026-01-01',
      })
    ).status,
    400,
  );
});

test('paying a due turns it into a transaction on the pay date', async () => {
  const res = await api.post(`/api/dues/${ids.receivable}/pay`, {
    accountId: ids.bank,
    amount: '4900.00',
    date: '2026-03-05',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.transaction_date, '2026-03-05');
  assert.equal(res.body.description, 'Acme invoice');
  assert.equal(await balance(ids.bank), '5000.00');
  assert.equal((await api.get('/api/dues?type=income')).body.total, 0);
  // already paid
  assert.equal(
    (
      await api.post(`/api/dues/${ids.receivable}/pay`, {
        accountId: ids.bank,
        amount: '1',
        date: '2026-03-05',
      })
    ).status,
    404,
  );
});

test('recurring generates each occurrence once, keeping month-end dates', async () => {
  const start = '2025-01-31';
  const id = await create('/api/recurring', {
    type: 'expense',
    categoryId: ids.hosting,
    amount: '10.00',
    frequency: 'monthly',
    startDate: start,
  });
  const dates = async () =>
    (await db('dues').where({ recurring_id: id }).orderBy('due_date').pluck('due_date')) as string[];

  await api.get('/api/dues');
  await api.get('/api/dues');
  const first = await dates();
  assert.deepEqual(first.slice(0, 4), ['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30']);
  assert.equal(new Set(first).size, first.length);
  assert.ok(first.at(-1)! <= new Date().toISOString().slice(0, 10));

  // A deleted (skipped) occurrence is not regenerated.
  await db('dues').where({ recurring_id: id, due_date: '2025-02-28' }).delete();
  await api.get('/api/dashboard');
  assert.equal((await dates()).length, first.length - 1);

  // Deleting the template keeps generated items.
  assert.equal((await api.del(`/api/recurring/${id}`)).status, 204);
  const kept = await db('dues').where({ amount: '10.00' }).whereNull('recurring_id').pluck('id');
  assert.equal(kept.length, first.length - 1);
});
