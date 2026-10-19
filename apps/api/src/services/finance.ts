/**
 * Single source of truth for every financial figure. Sums run in PostgreSQL NUMERIC;
 * derived values (profit, ROI) use decimal.js. No JS floating point touches money.
 */
import Decimal from 'decimal.js';
import type { Db } from '../db';
import type { Range } from '../validators';

const MIN = '-infinity';
const MAX = 'infinity';
const bounds = (r: Range) => [r.from ?? MIN, r.to ?? MAX] as const;
const money = (v: Decimal.Value) => new Decimal(v).toFixed(2);

/** (numerator / denominator) × 100, or null (shown as N/A) when the denominator is zero. */
export function roi(numerator: Decimal.Value, denominator: Decimal.Value): string | null {
  const d = new Decimal(denominator);
  return d.isZero() ? null : new Decimal(numerator).div(d).times(100).toFixed(2);
}

/**
 * Per-account balances.
 * Balance = Opening + Income - Expenses + Transfers In - Transfers Out - Investments funded.
 * `periodOpening` is the balance just before `from`; `balance` is the balance at the end of `to`;
 * the movement columns cover only the [from, to] range.
 */
export async function accountBalances(db: Db, range: Range = {}, accountId?: string) {
  const [from, to] = bounds(range);
  const { rows } = await db.raw(
    `
    with m as (
      select account_id, transaction_date as d,
             case when type = 'income' then amount else 0 end as income,
             case when type = 'expense' then amount else 0 end as expense,
             0::numeric as tin, 0::numeric as tout, 0::numeric as inv
        from transactions
      union all select to_account_id, transfer_date, 0, 0, amount, 0, 0 from transfers
      union all select from_account_id, transfer_date, 0, 0, 0, amount, 0 from transfers
      union all select account_id, investment_date, 0, 0, 0, 0, amount from investments
    )
    select a.id, a.name, a.type, a.is_active, a.opening_balance,
      (a.opening_balance + coalesce(sum(m.income - m.expense + m.tin - m.tout - m.inv) filter (where m.d < ?::date), 0))::numeric(18,2) as period_opening,
      coalesce(sum(m.income) filter (where m.d between ?::date and ?::date), 0)::numeric(18,2) as income,
      coalesce(sum(m.expense) filter (where m.d between ?::date and ?::date), 0)::numeric(18,2) as expenses,
      coalesce(sum(m.tin) filter (where m.d between ?::date and ?::date), 0)::numeric(18,2) as transfers_in,
      coalesce(sum(m.tout) filter (where m.d between ?::date and ?::date), 0)::numeric(18,2) as transfers_out,
      coalesce(sum(m.inv) filter (where m.d between ?::date and ?::date), 0)::numeric(18,2) as investments,
      (a.opening_balance + coalesce(sum(m.income - m.expense + m.tin - m.tout - m.inv) filter (where m.d <= ?::date), 0))::numeric(18,2) as balance
    from accounts a
    left join m on m.account_id = a.id
    where (?::uuid is null or a.id = ?::uuid)
    group by a.id
    order by a.is_active desc, a.name
    `,
    [from, from, to, from, to, from, to, from, to, from, to, to, accountId ?? null, accountId ?? null],
  );
  return rows as {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    opening_balance: string;
    period_opening: string;
    income: string;
    expenses: string;
    transfers_in: string;
    transfers_out: string;
    investments: string;
    balance: string;
  }[];
}

export async function totalBalance(db: Db, range: Range = {}) {
  const rows = await accountBalances(db, range);
  return money(rows.reduce((sum, r) => sum.plus(r.balance), new Decimal(0)));
}

/** Operational income/expenses (transfers and investments excluded) and investment-based ROI. */
export async function summary(db: Db, range: Range = {}, projectId?: string) {
  const [from, to] = bounds(range);
  const { rows } = await db.raw(
    `
    select
      coalesce((select sum(amount) from transactions where type = 'income' and transaction_date between ?::date and ?::date and (?::uuid is null or project_id = ?::uuid)), 0)::numeric(18,2) as income,
      coalesce((select sum(amount) from transactions where type = 'expense' and transaction_date between ?::date and ?::date and (?::uuid is null or project_id = ?::uuid)), 0)::numeric(18,2) as expenses,
      coalesce((select sum(amount) from investments where investment_date between ?::date and ?::date and (?::uuid is null or project_id = ?::uuid)), 0)::numeric(18,2) as investment
    `,
    [
      from,
      to,
      projectId ?? null,
      projectId ?? null,
      from,
      to,
      projectId ?? null,
      projectId ?? null,
      from,
      to,
      projectId ?? null,
      projectId ?? null,
    ],
  );
  return withProfit(rows[0] as { income: string; expenses: string; investment: string });
}

/**
 * Operational: profit = income - expenses; roi = profit / expenses × 100.
 * Investment-based: net return = income - expenses - investment; investmentRoi = net return / investment × 100.
 * Investment cost is subtracted once, here, and never recorded as an expense.
 */
export function withProfit<T extends { income: string; expenses: string; investment: string }>(r: T) {
  const profit = new Decimal(r.income).minus(r.expenses);
  const netReturn = profit.minus(r.investment);
  return {
    ...r,
    profit: money(profit),
    roi: roi(profit, r.expenses),
    netReturn: money(netReturn),
    investmentRoi: roi(netReturn, r.investment),
  };
}

export async function projectStats(db: Db, range: Range = {}, projectId?: string) {
  const [from, to] = bounds(range);
  const { rows } = await db.raw(
    `
    select p.id, p.name, p.client_name, p.description, p.status, p.start_date, p.created_at, p.updated_at,
      coalesce(t.income, 0)::numeric(18,2) as income,
      coalesce(t.expenses, 0)::numeric(18,2) as expenses,
      coalesce(i.investment, 0)::numeric(18,2) as investment
    from projects p
    left join (
      select project_id,
             sum(amount) filter (where type = 'income') as income,
             sum(amount) filter (where type = 'expense') as expenses
        from transactions
       where project_id is not null and transaction_date between ?::date and ?::date
       group by project_id
    ) t on t.project_id = p.id
    left join (
      select project_id, sum(amount) as investment
        from investments
       where project_id is not null and investment_date between ?::date and ?::date
       group by project_id
    ) i on i.project_id = p.id
    where (?::uuid is null or p.id = ?::uuid)
    order by p.created_at desc
    `,
    [from, to, from, to, projectId ?? null, projectId ?? null],
  );
  type Row = {
    id: string;
    name: string;
    client_name: string | null;
    status: string;
    income: string;
    expenses: string;
    investment: string;
  };
  return (rows as Row[]).map(withProfit);
}

/** Month-by-month income, expenses and profit, including empty months. */
export async function monthly(db: Db, from: string, to: string) {
  const { rows } = await db.raw(
    `
    select to_char(m, 'YYYY-MM') as month,
      coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric(18,2) as income,
      coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric(18,2) as expenses
    from generate_series(date_trunc('month', ?::date), date_trunc('month', ?::date), interval '1 month') m
    left join transactions t
      on date_trunc('month', t.transaction_date) = m and t.transaction_date between ?::date and ?::date
    group by m
    order by m
    `,
    [from, to, from, to],
  );
  return (rows as { month: string; income: string; expenses: string }[]).map((r) => ({
    ...r,
    profit: money(new Decimal(r.income).minus(r.expenses)),
  }));
}

/** Totals per category within the range (Profit & Loss). */
export async function categoryTotals(db: Db, range: Range = {}, projectId?: string) {
  const [from, to] = bounds(range);
  const { rows } = await db.raw(
    `
    select c.id, c.name, c.type, coalesce(sum(t.amount), 0)::numeric(18,2) as total
      from categories c
      join transactions t on t.category_id = c.id
     where t.transaction_date between ?::date and ?::date and (?::uuid is null or t.project_id = ?::uuid)
     group by c.id
     order by c.type, total desc, c.name
    `,
    [from, to, projectId ?? null, projectId ?? null],
  );
  return rows as { id: string; name: string; type: 'income' | 'expense'; total: string }[];
}
