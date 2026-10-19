'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  Amount,
  Badge,
  Card,
  ErrorNote,
  PageHeader,
  Pagination,
  StatCard,
  TableState,
} from '@/components/ui';
import { qs, useApi } from '@/lib/api';
import { date, label, money } from '@/lib/format';
import type { Account, Page } from '@/lib/types';

type Entry = {
  id: string;
  kind: string;
  date: string;
  description: string | null;
  label: string;
  amount: string;
};
const kindTone = {
  income: 'green',
  expense: 'red',
  transfer_in: 'blue',
  transfer_out: 'amber',
  investment: 'slate',
} as const;

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const account = useApi<Account>(`/accounts/${id}`);
  const history = useApi<Page<Entry>>(`/accounts/${id}/history${qs({ page, pageSize: 25 })}`);
  const a = account.data;

  return (
    <>
      <Link
        href="/accounts"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="size-4" /> Accounts
      </Link>
      <PageHeader
        title={a?.name ?? 'Account'}
        subtitle={a ? `${label(a.type)} account${a.is_active ? '' : ' · archived'}` : undefined}
      />
      <ErrorNote message={account.error} />
      {a && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Current balance" value={money(a.balance)} tone="blue" />
          <StatCard label="Opening balance" value={money(a.opening_balance)} />
          <StatCard label="Income" value={money(a.income)} tone="green" />
          <StatCard label="Expenses" value={money(a.expenses)} tone="red" />
          <StatCard label="Transfers in" value={money(a.transfers_in)} />
          <StatCard label="Transfers out" value={money(a.transfers_out)} />
          <StatCard label="Investments funded" value={money(a.investments)} />
        </div>
      )}
      <Card>
        <h2 className="px-5 py-4 font-display text-lg font-medium text-slate-900">Transaction history</h2>
        <TableState
          loading={history.loading}
          error={history.error}
          empty={!history.data?.data.length}
          emptyMessage="No activity on this account yet."
        >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">Type</th>
                <th className="th">Details</th>
                <th className="th">Description</th>
                <th className="th text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.data?.data.map((e) => (
                <tr key={`${e.kind}-${e.id}`}>
                  <td className="td">{date(e.date)}</td>
                  <td className="td">
                    <Badge tone={kindTone[e.kind as keyof typeof kindTone] ?? 'slate'}>{label(e.kind)}</Badge>
                  </td>
                  <td className="td">{e.label}</td>
                  <td className="td max-w-xs truncate text-slate-500">{e.description || '—'}</td>
                  <td className="td text-right font-medium">
                    <Amount value={e.amount} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
        {history.data && <Pagination {...history.data} onChange={setPage} />}
      </Card>
    </>
  );
}
