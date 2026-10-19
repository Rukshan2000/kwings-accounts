import { Router } from 'express';
import Decimal from 'decimal.js';
import { z } from 'zod';
import { db } from '../db';
import { notFound } from '../middleware/errors';
import { accountBalances, categoryTotals, projectStats, summary } from '../services/finance';
import { reportQuery } from '../validators';
import { transactionsQuery } from './transactions';

type Column = { key: string; label: string; money?: boolean };
type Report = {
  title: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
};
type Filters = z.infer<typeof reportQuery>;

const sum = (rows: Record<string, unknown>[], key: string) =>
  rows.reduce((s, r) => s.plus(String(r[key] ?? 0)), new Decimal(0)).toFixed(2);

const pct = (v: string | null) => (v === null ? 'N/A' : `${v}%`);

async function transactionReport(type: 'income' | 'expense', f: Filters): Promise<Report> {
  const rows = await transactionsQuery({ ...f, type });
  return {
    title: type === 'income' ? 'Income Report' : 'Expense Report',
    columns: [
      { key: 'transaction_date', label: 'Date' },
      { key: 'category_name', label: 'Category' },
      { key: 'account_name', label: type === 'income' ? 'Received In' : 'Paid From' },
      { key: 'project_name', label: 'Project' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount (LKR)', money: true },
    ],
    rows,
    totals: { amount: sum(rows, 'amount') },
  };
}

const reports: Record<string, (f: Filters) => Promise<Report>> = {
  income: (f) => transactionReport('income', f),
  expense: (f) => transactionReport('expense', f),

  'profit-loss': async (f) => {
    const [rows, totals] = await Promise.all([
      categoryTotals(db, f, f.projectId),
      summary(db, f, f.projectId),
    ]);
    return {
      title: 'Profit & Loss Report',
      columns: [
        { key: 'type', label: 'Type' },
        { key: 'name', label: 'Category' },
        { key: 'total', label: 'Amount (LKR)', money: true },
      ],
      rows: [
        ...rows.map((r) => ({ ...r, type: r.type === 'income' ? 'Income' : 'Expense' })),
        { type: 'Summary', name: 'Total Income', total: totals.income },
        { type: 'Summary', name: 'Total Expenses', total: totals.expenses },
        { type: 'Summary', name: 'Net Profit / Loss', total: totals.profit },
      ],
    };
  },

  'account-balances': async (f) => {
    const rows = await accountBalances(db, f);
    const keys = [
      'period_opening',
      'income',
      'expenses',
      'transfers_in',
      'transfers_out',
      'investments',
      'balance',
    ];
    return {
      title: 'Account Balance Report',
      columns: [
        { key: 'name', label: 'Account' },
        { key: 'type', label: 'Type' },
        { key: 'period_opening', label: 'Opening', money: true },
        { key: 'income', label: 'Income', money: true },
        { key: 'expenses', label: 'Expenses', money: true },
        { key: 'transfers_in', label: 'Transfers In', money: true },
        { key: 'transfers_out', label: 'Transfers Out', money: true },
        { key: 'investments', label: 'Investments', money: true },
        { key: 'balance', label: 'Closing Balance', money: true },
      ],
      rows,
      totals: Object.fromEntries(keys.map((k) => [k, sum(rows, k)])),
    };
  },

  'project-profitability': async (f) => {
    const rows = (await projectStats(db, f, f.projectId)).map((p) => ({
      ...p,
      roi_label: pct(p.roi),
      investment_roi_label: pct(p.investmentRoi),
    }));
    return {
      title: 'Project Profitability Report',
      columns: [
        { key: 'name', label: 'Project' },
        { key: 'client_name', label: 'Client' },
        { key: 'status', label: 'Status' },
        { key: 'income', label: 'Income', money: true },
        { key: 'expenses', label: 'Expenses', money: true },
        { key: 'profit', label: 'Profit / Loss', money: true },
        { key: 'roi_label', label: 'ROI' },
        { key: 'investment', label: 'Investment', money: true },
        { key: 'investment_roi_label', label: 'Investment ROI' },
      ],
      rows,
      totals: Object.fromEntries(
        ['income', 'expenses', 'profit', 'investment'].map((k) => [k, sum(rows, k)]),
      ),
    };
  },
};

/** RFC 4180 quoting, plus neutralising spreadsheet formulas in text cells. */
function csvCell(value: unknown) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(report: Report) {
  const lines = [report.columns.map((c) => csvCell(c.label)).join(',')];
  for (const row of report.rows) lines.push(report.columns.map((c) => csvCell(row[c.key])).join(','));
  if (report.totals) {
    lines.push(
      report.columns.map((c, i) => csvCell(i === 0 ? 'TOTAL' : (report.totals![c.key] ?? ''))).join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

const router = Router();

router.get('/:name', async (req, res) => {
  const build = reports[req.params.name];
  if (!build) throw notFound('Report');
  const filters = reportQuery.parse(req.query);
  const report = await build(filters);
  if (filters.format === 'csv') {
    const range = [filters.from, filters.to].filter(Boolean).join('_to_') || 'all';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.name}-${range}.csv"`);
    return res.send(toCsv(report));
  }
  res.json(report);
});

export default router;
