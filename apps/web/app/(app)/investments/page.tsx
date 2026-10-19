'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useConfirm, useToast } from '@/components/feedback';
import { AccountSelect, AmountInput, ProjectSelect } from '@/components/forms';
import {
  Button,
  Card,
  DateRange,
  Field,
  FormModal,
  IconButton,
  PageHeader,
  Pagination,
  StatCard,
  TableState,
} from '@/components/ui';
import { api, qs, useApi } from '@/lib/api';
import { date, isNegative, money, percent, today } from '@/lib/format';
import { useRefs } from '@/lib/refs';
import type { Investment, Page, Totals } from '@/lib/types';

type Form = {
  id?: string;
  name: string;
  accountId: string;
  projectId: string;
  amount: string;
  date: string;
  description: string;
  originalAccountId?: string;
};

export default function InvestmentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { accounts, projects } = useRefs();
  const [filters, setFilters] = useState({ from: '', to: '', projectId: '' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const list = useApi<Page<Investment> & { totals: Totals }>(
    `/investments${qs({ ...filters, page, pageSize: 25 })}`,
  );
  const t = list.data?.totals;
  const update = (patch: Partial<typeof filters>) => (setFilters((f) => ({ ...f, ...patch })), setPage(1));

  async function save(f: Form) {
    const body = {
      name: f.name,
      accountId: f.accountId,
      projectId: f.projectId || null,
      amount: f.amount,
      date: f.date,
      description: f.description,
    };
    if (f.id) await api(`/investments/${f.id}`, 'PUT', body);
    else await api('/investments', 'POST', body);
    toast(f.id ? 'Investment updated' : 'Investment recorded');
    list.reload();
  }

  async function remove(i: Investment) {
    if (!(await confirm(`Delete investment "${i.name}" (${money(i.amount)})?`))) return;
    try {
      await api(`/investments/${i.id}`, 'DELETE');
      toast('Investment deleted');
      list.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Investments"
        subtitle="Capital allocations. They reduce the funding account's balance but are not operating expenses."
        actions={
          <Button
            onClick={() =>
              setForm({
                name: '',
                accountId: '',
                projectId: filters.projectId,
                amount: '',
                date: today(),
                description: '',
              })
            }
          >
            <Plus className="size-4" /> New investment
          </Button>
        }
      />

      {t && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Investment" value={money(t.investment)} tone="blue" />
          <StatCard
            label="Operational Profit"
            value={money(t.profit)}
            tone={isNegative(t.profit) ? 'red' : 'green'}
            hint="Income − expenses (investments excluded)"
          />
          <StatCard
            label="Net Return"
            value={money(t.netReturn)}
            tone={isNegative(t.netReturn) ? 'red' : 'green'}
            hint="Income − expenses − investment"
          />
          <StatCard
            label="Investment ROI"
            value={percent(t.investmentRoi)}
            tone={t.investmentRoi === null ? 'neutral' : isNegative(t.investmentRoi) ? 'red' : 'green'}
            hint="Net return ÷ investment × 100"
          />
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 gap-2 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DateRange from={filters.from} to={filters.to} onChange={(from, to) => update({ from, to })} />
          <select
            className="input"
            value={filters.projectId}
            onChange={(e) => update({ projectId: e.target.value })}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <TableState
          loading={list.loading}
          error={list.error}
          empty={!list.data?.data.length}
          emptyMessage="No investments recorded."
        >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">Investment</th>
                <th className="th">Project</th>
                <th className="th">Funded from</th>
                <th className="th">Description</th>
                <th className="th text-right">Amount</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.data?.data.map((i) => (
                <tr key={i.id}>
                  <td className="td">{date(i.investment_date)}</td>
                  <td className="td font-medium">{i.name}</td>
                  <td className="td">{i.project_name ?? '—'}</td>
                  <td className="td">{i.account_name}</td>
                  <td className="td max-w-xs truncate text-slate-500">{i.description || '—'}</td>
                  <td className="td text-right font-medium tabular-nums">{money(i.amount)}</td>
                  <td className="td text-right">
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setForm({
                          id: i.id,
                          name: i.name,
                          accountId: i.account_id,
                          originalAccountId: i.account_id,
                          projectId: i.project_id ?? '',
                          amount: i.amount,
                          date: i.investment_date,
                          description: i.description ?? '',
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(i)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
        {list.data && <Pagination {...list.data} onChange={setPage} />}
      </Card>

      {form && (
        <FormModal
          open
          title={form.id ? 'Edit investment' : 'New investment'}
          onClose={() => setForm(null)}
          onSubmit={() => save(form)}
        >
          <Field label="Investment name">
            <input
              className="input"
              required
              maxLength={150}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (LKR)">
              <AmountInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
            </Field>
            <Field label="Date">
              <input
                type="date"
                className="input"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Funding account">
            <AccountSelect
              accounts={accounts}
              value={form.accountId}
              currentId={form.originalAccountId}
              onChange={(v) => setForm({ ...form, accountId: v })}
            />
          </Field>
          <Field label="Project (optional)">
            <ProjectSelect
              projects={projects}
              value={form.projectId}
              onChange={(v) => setForm({ ...form, projectId: v })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input"
              rows={2}
              maxLength={1000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </FormModal>
      )}
    </>
  );
}
