'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, DateRange, PageHeader, TableState } from '@/components/ui';
import { qs, useApi } from '@/lib/api';
import { date, isNegative, label, money, startOfYear, today } from '@/lib/format';
import { useRefs } from '@/lib/refs';

type Report = {
  title: string;
  columns: { key: string; label: string; money?: boolean }[];
  rows: Record<string, string | null>[];
  totals?: Record<string, string>;
};

const reports = [
  { id: 'income', name: 'Income', category: 'income', project: true },
  { id: 'expense', name: 'Expenses', category: 'expense', project: true },
  { id: 'profit-loss', name: 'Profit & Loss', project: true },
  { id: 'account-balances', name: 'Account Balances' },
  { id: 'project-profitability', name: 'Project Profitability', project: true },
] as const;

function cell(key: string, value: string | null, isMoney?: boolean) {
  if (value === null || value === undefined || value === '') return '—';
  if (isMoney) return <span className={isNegative(value) ? 'text-red-600' : ''}>{money(value, false)}</span>;
  if (key.endsWith('_date')) return date(value);
  if (key === 'status' || key === 'type') return label(value);
  return value;
}

export default function ReportsPage() {
  const { categories, projects } = useRefs();
  const [reportId, setReportId] = useState<(typeof reports)[number]['id']>('income');
  const [filters, setFilters] = useState({ from: startOfYear(), to: today(), categoryId: '', projectId: '' });
  const def = reports.find((r) => r.id === reportId)!;
  const params = {
    from: filters.from,
    to: filters.to,
    categoryId: 'category' in def ? filters.categoryId : '',
    projectId: 'project' in def ? filters.projectId : '',
  };
  const report = useApi<Report>(`/reports/${reportId}${qs(params)}`);
  const r = report.data;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Filter by date, category and project; export to CSV"
        actions={
          <a
            href={`/api/reports/${reportId}${qs({ ...params, format: 'csv' })}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Download className="size-4" /> Export CSV
          </a>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {reports.map((x) => (
          <button
            key={x.id}
            onClick={() => (setReportId(x.id), setFilters((f) => ({ ...f, categoryId: '' })))}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${reportId === x.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            {x.name}
          </button>
        ))}
      </div>
      <Card>
        <div className="grid grid-cols-1 gap-2 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DateRange
            from={filters.from}
            to={filters.to}
            onChange={(from, to) => setFilters((f) => ({ ...f, from, to }))}
          />
          {'category' in def && (
            <select
              className="input"
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">All categories</option>
              {categories
                .filter((c) => c.type === def.category)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          )}
          {'project' in def && (
            <select
              className="input"
              value={filters.projectId}
              onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {r && <h2 className="px-5 pt-4 font-display text-lg font-medium text-slate-900">{r.title}</h2>}
        <TableState
          loading={report.loading}
          error={report.error}
          empty={!r?.rows.length}
          emptyMessage="No data for these filters."
        >
          {r && (
            <table className="mt-2 min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {r.columns.map((c) => (
                    <th key={c.key} className={`th ${c.money ? 'text-right' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {r.rows.map((row, i) => (
                  <tr key={i} className={row.type === 'Summary' ? 'bg-slate-50 font-semibold' : ''}>
                    {r.columns.map((c) => (
                      <td key={c.key} className={`td ${c.money ? 'text-right tabular-nums' : ''}`}>
                        {cell(c.key, row[c.key], c.money)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {r.totals && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <tr>
                    {r.columns.map((c, i) => (
                      <td key={c.key} className={`td ${c.money ? 'text-right tabular-nums' : ''}`}>
                        {i === 0
                          ? 'Total'
                          : r.totals![c.key] !== undefined
                            ? cell(c.key, r.totals![c.key], c.money)
                            : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </TableState>
      </Card>
    </>
  );
}
