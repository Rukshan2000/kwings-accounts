'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CalendarDays,
  Landmark,
  Percent,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { BarChart } from '@/components/charts';
import {
  Amount,
  Card,
  DateRange,
  ErrorNote,
  PageHeader,
  Spinner,
  StatCard,
  TableState,
} from '@/components/ui';
import { qs, useApi } from '@/lib/api';
import { date, isNegative, money, percent, startOfYear, today } from '@/lib/format';
import type { Totals, Transaction } from '@/lib/types';

interface Dashboard {
  totals: Totals;
  totalBalance: string;
  thisMonth: { income: string; expenses: string };
  monthly: { month: string; income: string; expenses: string; profit: string }[];
  recent: Transaction[];
}

export default function DashboardPage() {
  const [range, setRange] = useState({ from: startOfYear(), to: today() });
  const { data, error, loading } = useApi<Dashboard>(`/dashboard${qs(range)}`);
  const t = data?.totals;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Financial overview for the selected period"
        actions={
          <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        }
      />
      <ErrorNote message={error} />
      {!data ? (
        loading && <Spinner />
      ) : (
        <div className={loading ? 'opacity-60' : ''}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Income"
              value={money(t!.income)}
              tone="green"
              icon={<TrendingUp className="size-4" />}
            />
            <StatCard
              label="Total Expenses"
              value={money(t!.expenses)}
              tone="red"
              icon={<TrendingDown className="size-4" />}
            />
            <StatCard
              label="Net Profit / Loss"
              value={money(t!.profit)}
              tone={isNegative(t!.profit) ? 'red' : 'green'}
              icon={<Briefcase className="size-4" />}
              hint="Operational: income − expenses"
            />
            <StatCard
              label="Total Account Balances"
              value={money(data.totalBalance)}
              tone="blue"
              icon={<Landmark className="size-4" />}
              hint="Current, all accounts"
            />
            <StatCard
              label="Total Investment"
              value={money(t!.investment)}
              icon={<PiggyBank className="size-4" />}
            />
            <StatCard
              label="ROI"
              value={percent(t!.investmentRoi)}
              tone={t!.investmentRoi === null ? 'neutral' : isNegative(t!.investmentRoi) ? 'red' : 'green'}
              icon={<Percent className="size-4" />}
              hint="(Income − Expenses − Investment) ÷ Investment"
            />
            <StatCard
              label="This Month Income"
              value={money(data.thisMonth.income)}
              tone="green"
              icon={<CalendarDays className="size-4" />}
            />
            <StatCard
              label="This Month Expenses"
              value={money(data.thisMonth.expenses)}
              tone="red"
              icon={<Wallet className="size-4" />}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Income vs Expenses</h2>
              <BarChart
                data={data.monthly}
                series={[
                  { key: 'income', label: 'Income', color: '#10b981' },
                  { key: 'expenses', label: 'Expenses', color: '#ef4444' },
                ]}
              />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold text-slate-900">Monthly Profit</h2>
              <BarChart
                data={data.monthly}
                series={[
                  { key: 'profit', label: 'Profit / Loss', color: '#2563eb', negativeColor: '#ef4444' },
                ]}
              />
            </Card>
          </div>

          <Card className="mt-6">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-semibold text-slate-900">Recent Transactions</h2>
              <Link href="/transactions" className="text-sm font-medium text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <TableState
              loading={false}
              empty={data.recent.length === 0}
              emptyMessage="No transactions in this period."
            >
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Category</th>
                    <th className="th">Account</th>
                    <th className="th">Description</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.map((tx) => (
                    <tr key={tx.id}>
                      <td className="td">{date(tx.transaction_date)}</td>
                      <td className="td">{tx.category_name}</td>
                      <td className="td">{tx.account_name}</td>
                      <td className="td max-w-xs truncate text-slate-500">{tx.description || '—'}</td>
                      <td className="td text-right font-medium">
                        <Amount value={tx.amount} type={tx.type} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableState>
          </Card>
        </div>
      )}
    </>
  );
}
