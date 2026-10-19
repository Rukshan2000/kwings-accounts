'use client';

import { useEffect, useState } from 'react';
import { Minus, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useConfirm, useToast } from '@/components/feedback';
import { AccountSelect, AmountInput, ProjectSelect } from '@/components/forms';
import {
  Amount,
  Badge,
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
import { date, money, today } from '@/lib/format';
import { useRefs } from '@/lib/refs';
import type { Page, Transaction, TxType } from '@/lib/types';

type Form = {
  id?: string;
  type: TxType;
  accountId: string;
  categoryId: string;
  projectId: string;
  amount: string;
  date: string;
  description: string;
  originalAccountId?: string;
};

/** `params`: optional type / accountId / projectId filters, and `new=income|expense` to open the add form. */
export function Transactions({ params }: { params: URLSearchParams }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { accounts, categories, projects } = useRefs();
  const [filters, setFilters] = useState({
    type: (params.get('type') ?? '') as TxType | '',
    from: '',
    to: '',
    accountId: params.get('accountId') ?? '',
    categoryId: '',
    projectId: params.get('projectId') ?? '',
  });
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(() => {
    const type = params.get('new');
    return type === 'income' || type === 'expense' ? newForm(type) : null;
  });

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useApi<Page<Transaction> & { totals: { income: string; expenses: string } }>(
    `/transactions${qs({ ...filters, q, page, pageSize: 25 })}`,
  );
  const update = (patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  function newForm(type: TxType): Form {
    return {
      type,
      accountId: '',
      categoryId: '',
      projectId: params.get('projectId') ?? '',
      amount: '',
      date: today(),
      description: '',
    };
  }

  async function save(f: Form) {
    const body = {
      type: f.type,
      accountId: f.accountId,
      categoryId: f.categoryId,
      projectId: f.projectId || null,
      amount: f.amount,
      date: f.date,
      description: f.description,
    };
    if (f.id) await api(`/transactions/${f.id}`, 'PUT', body);
    else await api('/transactions', 'POST', body);
    toast(f.id ? 'Transaction updated' : `${f.type === 'income' ? 'Income' : 'Expense'} added`);
    list.reload();
  }

  async function remove(t: Transaction) {
    if (
      !(await confirm(`Delete this ${t.type} of ${money(t.amount)}? Account balances will be recalculated.`))
    )
      return;
    try {
      await api(`/transactions/${t.id}`, 'DELETE');
      toast('Transaction deleted');
      list.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const filterCategories = categories.filter((c) => !filters.type || c.type === filters.type);

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Income and expenses"
        actions={
          <>
            <Button variant="secondary" onClick={() => setForm(newForm('expense'))}>
              <Minus className="size-4 text-red-600" /> Add expense
            </Button>
            <Button onClick={() => setForm(newForm('income'))}>
              <Plus className="size-4" /> Add income
            </Button>
          </>
        }
      />

      {list.data && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Income (filtered)" value={money(list.data.totals.income)} tone="green" />
          <StatCard label="Expenses (filtered)" value={money(list.data.totals.expenses)} tone="red" />
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() => update({ type: t, categoryId: '' })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filters.type === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t === '' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute top-2.5 left-3 size-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search…"
                value={search}
                onChange={(e) => (setSearch(e.target.value), setPage(1))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <DateRange from={filters.from} to={filters.to} onChange={(from, to) => update({ from, to })} />
            <select
              className="input"
              value={filters.accountId}
              onChange={(e) => update({ accountId: e.target.value })}
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filters.categoryId}
              onChange={(e) => update({ categoryId: e.target.value })}
            >
              <option value="">All categories</option>
              {filterCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
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
        </div>

        <TableState
          loading={list.loading}
          error={list.error}
          empty={!list.data?.data.length}
          emptyMessage="No transactions match these filters."
        >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">Type</th>
                <th className="th">Category</th>
                <th className="th">Account</th>
                <th className="th">Project</th>
                <th className="th">Description</th>
                <th className="th text-right">Amount</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.data?.data.map((t) => (
                <tr key={t.id}>
                  <td className="td">{date(t.transaction_date)}</td>
                  <td className="td">
                    <Badge tone={t.type === 'income' ? 'green' : 'red'}>
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                  </td>
                  <td className="td">{t.category_name}</td>
                  <td className="td">{t.account_name}</td>
                  <td className="td">{t.project_name ?? '—'}</td>
                  <td className="td max-w-xs truncate text-slate-500">{t.description || '—'}</td>
                  <td className="td text-right font-medium">
                    <Amount value={t.amount} type={t.type} />
                  </td>
                  <td className="td text-right">
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setForm({
                          id: t.id,
                          type: t.type,
                          accountId: t.account_id,
                          originalAccountId: t.account_id,
                          categoryId: t.category_id,
                          projectId: t.project_id ?? '',
                          amount: t.amount,
                          date: t.transaction_date,
                          description: t.description ?? '',
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(t)}>
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
          title={`${form.id ? 'Edit' : 'Add'} ${form.type === 'income' ? 'income' : 'expense'}`}
          onClose={() => setForm(null)}
          onSubmit={() => save(form)}
        >
          {form.id && (
            <Field label="Type">
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as TxType, categoryId: '' })}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
          )}
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
          <Field label="Category">
            <select
              className="input"
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select category</option>
              {categories
                .filter((c) => c.type === form.type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={form.type === 'income' ? 'Received in account' : 'Paid from account'}>
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
