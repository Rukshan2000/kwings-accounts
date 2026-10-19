import { randomUUID } from 'node:crypto';
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
  ids.cash = await create('/api/accounts', { name: 'Cash', type: 'cash', openingBalance: '1000.00' });
  ids.bank = await create('/api/accounts', { name: 'Bank', type: 'bank', openingBalance: '0' });
  ids.web = await create('/api/categories', { name: 'Website Development', type: 'income' });
  ids.hosting = await create('/api/categories', { name: 'Hosting', type: 'expense' });
  ids.project = await create('/api/projects', { name: 'Client Site', clientName: 'Acme', status: 'active' });
});
after(async () => {
  await api.close();
  await db.destroy();
});

test('income and expense creation update the account balance', async () => {
  ids.income = await create('/api/transactions', {
    type: 'income',
    accountId: ids.cash,
    categoryId: ids.web,
    projectId: ids.project,
    amount: '5000.10',
    date: '2026-01-15',
    description: 'Deposit',
  });
  ids.expense = await create('/api/transactions', {
    type: 'expense',
    accountId: ids.cash,
    categoryId: ids.hosting,
    projectId: ids.project,
    amount: 1000.05,
    date: '2026-02-10',
  });
  // 1000 + 5000.10 - 1000.05
  assert.equal(await balance(ids.cash), '5000.05');
});

test('financial validation rejects bad input', async () => {
  const base = { type: 'income', accountId: ids.cash, categoryId: ids.web, date: '2026-01-01' };
  for (const amount of ['-5', '0', '0.00', '1.234', 'abc', '']) {
    assert.equal((await api.post('/api/transactions', { ...base, amount })).status, 400, `amount ${amount}`);
  }
  assert.equal(
    (await api.post('/api/transactions', { ...base, amount: '1', date: '2026-13-40' })).status,
    400,
  );
  // category type must match transaction type
  assert.equal(
    (await api.post('/api/transactions', { ...base, amount: '1', categoryId: ids.hosting })).status,
    400,
  );
  assert.equal(
    (await api.post('/api/transactions', { ...base, amount: '1', accountId: randomUUID() })).status,
    400,
  );
  // database constraint is the last line of defence
  await assert.rejects(db('transactions').insert({ ...dbRow(), amount: '-1' }));
});

function dbRow() {
  return {
    type: 'income',
    account_id: ids.cash,
    category_id: ids.web,
    transaction_date: '2026-01-01',
    amount: '1',
  };
}

test('transfers move money between accounts without touching income or expenses', async () => {
  const key = randomUUID();
  const body = {
    fromAccountId: ids.cash,
    toAccountId: ids.bank,
    amount: '2000.00',
    date: '2026-02-20',
    idempotencyKey: key,
  };
  assert.equal((await api.post('/api/transfers', body)).status, 201);
  // Same request again (double-click / retry): no duplicate.
  const retry = await api.post('/api/transfers', body);
  assert.equal(retry.status, 200);
  assert.equal(
    await db('transfers')
      .where({ idempotency_key: key })
      .count('* as c')
      .first()
      .then((r) => r?.c),
    '1',
  );

  assert.equal(await balance(ids.cash), '3000.05');
  assert.equal(await balance(ids.bank), '2000.00');

  const same = { ...body, toAccountId: ids.cash, idempotencyKey: randomUUID() };
  assert.equal((await api.post('/api/transfers', same)).status, 400);

  const dash = (await api.get('/api/dashboard')).body;
  assert.equal(dash.totals.income, '5000.10');
  assert.equal(dash.totals.expenses, '1000.05');
  assert.equal(dash.totals.profit, '4000.05');
  assert.equal(dash.totalBalance, '5000.05');
});

test('editing and deleting transactions recalculates balances', async () => {
  const res = await api.put(`/api/transactions/${ids.expense}`, {
    type: 'expense',
    accountId: ids.bank,
    categoryId: ids.hosting,
    projectId: ids.project,
    amount: '500.00',
    date: '2026-02-10',
  });
  assert.equal(res.status, 200);
  assert.equal(await balance(ids.cash), '4000.10');
  assert.equal(await balance(ids.bank), '1500.00');

  ids.extra = await create('/api/transactions', {
    type: 'income',
    accountId: ids.bank,
    categoryId: ids.web,
    amount: '99.99',
    date: '2026-03-01',
  });
  assert.equal(await balance(ids.bank), '1599.99');
  assert.equal((await api.del(`/api/transactions/${ids.extra}`)).status, 204);
  assert.equal(await balance(ids.bank), '1500.00');
});

test('project profit and ROI', async () => {
  const p = (await api.get(`/api/projects/${ids.project}`)).body;
  assert.equal(p.income, '5000.10');
  assert.equal(p.expenses, '500.00');
  assert.equal(p.profit, '4500.10');
  assert.equal(p.roi, '900.02'); // 4500.10 / 500 × 100
  assert.equal(p.investmentRoi, null);

  const empty = await create('/api/projects', { name: 'No Expenses' });
  assert.equal((await api.get(`/api/projects/${empty}`)).body.roi, null); // displayed as N/A
});

test('investments reduce account balance but not operational profit', async () => {
  ids.investment = await create('/api/investments', {
    name: 'Server hardware',
    accountId: ids.cash,
    projectId: ids.project,
    amount: '1000.00',
    date: '2026-01-20',
  });
  assert.equal(await balance(ids.cash), '3000.10');

  const p = (await api.get(`/api/projects/${ids.project}`)).body;
  assert.equal(p.profit, '4500.10'); // unchanged: investment is not an expense
  assert.equal(p.investment, '1000.00');
  assert.equal(p.netReturn, '3500.10'); // 5000.10 - 500 - 1000, cost counted once
  assert.equal(p.investmentRoi, '350.01'); // 3500.10 / 1000 × 100

  const dash = (await api.get('/api/dashboard')).body;
  assert.equal(dash.totals.profit, '4500.10');
  assert.equal(dash.totals.investment, '1000.00');
  assert.equal(dash.totals.investmentRoi, '350.01');
});

test('date range filters use transaction dates', async () => {
  const jan = (await api.get('/api/dashboard?from=2026-01-01&to=2026-01-31')).body.totals;
  assert.equal(jan.income, '5000.10');
  assert.equal(jan.expenses, '0.00');
  assert.equal(jan.investment, '1000.00');
  const feb = (await api.get('/api/transactions?from=2026-02-01&to=2026-02-28')).body;
  assert.equal(feb.total, 1);
  assert.equal(feb.totals.expenses, '500.00');
  assert.equal((await api.get('/api/dashboard?from=2026-03-01&to=2026-01-01')).status, 400);

  // Account balance as of a date + movements within the range.
  const report = (await api.get('/api/reports/account-balances?from=2026-02-01&to=2026-02-28')).body;
  const cash = report.rows.find((r: { name: string }) => r.name === 'Cash');
  assert.equal(cash.period_opening, '5000.10'); // 1000 + 5000.10 - 1000 investment (Jan)
  assert.equal(cash.transfers_out, '2000.00');
  assert.equal(cash.balance, '3000.10');
});

test('reports export CSV', async () => {
  const res = await api.get('/api/reports/income?format=csv');
  assert.equal(res.status, 200);
  const lines = res.body.trim().split('\r\n');
  assert.equal(lines[0], 'Date,Category,Received In,Project,Description,Amount (LKR)');
  assert.equal(lines.at(-1), 'TOTAL,,,,,5000.10');
  const pl = (await api.get('/api/reports/profit-loss')).body;
  assert.equal(pl.rows.at(-1).total, '4500.10');
});

test('accounts with records cannot be deleted; archived accounts reject new records', async () => {
  assert.equal((await api.del(`/api/accounts/${ids.cash}`)).status, 409);
  const res = await api.put(`/api/accounts/${ids.bank}`, {
    name: 'Bank',
    type: 'bank',
    openingBalance: '0',
    isActive: false,
  });
  assert.equal(res.status, 200);
  const tx = { type: 'income', accountId: ids.bank, categoryId: ids.web, amount: '1', date: '2026-04-01' };
  assert.equal((await api.post('/api/transactions', tx)).status, 400);
  const unused = await create('/api/accounts', { name: 'Unused', type: 'wallet' });
  assert.equal((await api.del(`/api/accounts/${unused}`)).status, 204);
});
