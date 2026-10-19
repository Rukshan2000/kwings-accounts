import { Router } from 'express';
import { db } from '../db';
import { monthly, summary, totalBalance } from '../services/finance';
import { rangeQuery } from '../validators';
import { transactionsQuery } from './transactions';

const router = Router();
const iso = (d: Date) => d.toISOString().slice(0, 10);

router.get('/', async (req, res) => {
  const range = rangeQuery.parse(req.query);
  const today = new Date();
  const monthStart = iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  // Chart covers the selected range, or the last 12 months when no range is given.
  const chartTo = range.to ?? iso(today);
  const chartFrom =
    range.from ?? iso(new Date(Date.UTC(Number(chartTo.slice(0, 4)), Number(chartTo.slice(5, 7)) - 12, 1)));

  const [totals, balance, thisMonth, series, recent] = await Promise.all([
    summary(db, range),
    totalBalance(db),
    summary(db, { from: monthStart, to: iso(today) }),
    monthly(db, chartFrom, chartTo),
    transactionsQuery(range).limit(10),
  ]);
  res.json({
    totals,
    totalBalance: balance,
    thisMonth: { income: thisMonth.income, expenses: thisMonth.expenses },
    monthly: series,
    recent,
  });
});

export default router;
