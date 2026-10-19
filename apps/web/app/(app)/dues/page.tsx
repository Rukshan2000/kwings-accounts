'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useConfirm, useToast } from '@/components/feedback';
import { AccountSelect, AmountInput, CategorySelect, ProjectSelect } from '@/components/forms';
import {
  Amount,
  Badge,
  Button,
  Card,
  Field,
  FormModal,
  IconButton,
  PageHeader,
  Pagination,
  TableState,
} from '@/components/ui';
import { api, qs, useApi } from '@/lib/api';
import { date, label, money, today } from '@/lib/format';
import { useRefs } from '@/lib/refs';
import type { Due, Outstanding, Page, Recurring, TxType } from '@/lib/types';

type Tab = TxType | 'recurring';
type Item = {
  id?: string;
  type: TxType;
  accountId: string;
  categoryId: string;
  projectId: string;
  amount: string;
  description: string;
  date: string; // due date, or start date for recurring
  frequency: Recurring['frequency'];
  isActive: boolean;
};
type Modal =
  | { kind: 'due' | 'recurring'; item: Item }
  | { kind: 'pay'; due: Due; accountId: string; amount: string; date: string };

const tabs: { key: Tab; label: string }[] = [
  { key: 'income', label: 'To receive' },
  { key: 'expense', label: 'To pay' },
  { key: 'recurring', label: 'Recurring' },
];

export default function DuesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { accounts, categories, projects } = useRefs();
  const [tab, setTab] = useState<Tab>('income');
  const [overdue, setOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const isDue = tab !== 'recurring';
  const dues = useApi<Page<Due> & { totals: Outstanding }>(
    `/dues${qs({ type: isDue ? tab : 'income', overdue: overdue ? 'true' : '', q, page, pageSize: 25 })}`,
  );
  const recurring = useApi<Recurring[]>(tab === 'recurring' ? '/recurring' : null);
  const totals = dues.data?.totals;
  const reload = () => (dues.reload(), tab === 'recurring' && recurring.reload());

  const blank = (type: TxType): Item => ({
    type,
    accountId: '',
    categoryId: '',
    projectId: '',
    amount: '',
    description: '',
    date: today(),
    frequency: 'monthly',
    isActive: true,
  });
  const fromRow = (r: Due | Recurring): Item => ({
    id: r.id,
    type: r.type,
    accountId: r.account_id ?? '',
    categoryId: r.category_id,
    projectId: r.project_id ?? '',
    amount: r.amount,
    description: r.description ?? '',
    date: 'due_date' in r ? r.due_date : r.start_date,
    frequency: 'frequency' in r ? r.frequency : 'monthly',
    isActive: 'is_active' in r ? r.is_active : true,
  });

  async function save(m: Modal) {
    if (m.kind === 'pay') {
      await api(`/dues/${m.due.id}/pay`, 'POST', { accountId: m.accountId, amount: m.amount, date: m.date });
      toast(m.due.type === 'income' ? 'Marked as received' : 'Marked as paid');
    } else {
      const i = m.item;
      const body = {
        type: i.type,
        accountId: i.accountId || null,
        categoryId: i.categoryId,
        projectId: i.projectId || null,
        amount: i.amount,
        description: i.description,
        ...(m.kind === 'due'
          ? { date: i.date }
          : { startDate: i.date, frequency: i.frequency, isActive: i.isActive }),
      };
      const base = m.kind === 'due' ? '/dues' : '/recurring';
      await api(i.id ? `${base}/${i.id}` : base, i.id ? 'PUT' : 'POST', body);
      toast(i.id ? 'Saved' : 'Added');
    }
    reload();
  }

  async function remove(kind: 'dues' | 'recurring', id: string, what: string) {
    const note = kind === 'recurring' ? ' Items it already created stay.' : '';
    if (!(await confirm(`Delete ${what}?${note}`))) return;
    try {
      await api(`/${kind}/${id}`, 'DELETE');
      toast('Deleted');
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  const tabTotal = (t: Tab) =>
    !totals ? null : t === 'income' ? totals.receivable : t === 'expense' ? totals.payable : null;
  const tabOverdue = (t: Tab) =>
    !totals
      ? '0'
      : t === 'income'
        ? totals.overdue_receivable
        : t === 'expense'
          ? totals.overdue_payable
          : '0';

  return (
    <>
      <PageHeader
        title="Dues & Recurring"
        subtitle="Money clients owe you, bills to pay, and repeating entries. Not counted in balances until settled."
        actions={
          <Button
            onClick={() =>
              setModal(
                tab === 'recurring'
                  ? { kind: 'recurring', item: blank('expense') }
                  : { kind: 'due', item: blank(tab) },
              )
            }
          >
            <Plus className="size-4" />{' '}
            {tab === 'recurring' ? 'New recurring' : tab === 'income' ? 'New receivable' : 'New bill'}
          </Button>
        }
      />

      <Card>
        <div role="tablist" className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((t) => {
            const total = tabTotal(t.key);
            const late = /[1-9]/.test(tabOverdue(t.key));
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => (setTab(t.key), setPage(1))}
                className={`-mb-px flex shrink-0 flex-col items-start border-b-2 px-5 py-3 text-left ${
                  tab === t.key ? 'border-blue-600' : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <span className={`text-sm font-medium ${tab === t.key ? 'text-blue-600' : 'text-slate-600'}`}>
                  {t.label}
                </span>
                {total !== null && (
                  <span className="text-xs text-slate-500 tabular-nums">
                    {money(total)}
                    {late && (
                      <span className="ml-1 text-red-600">· {money(tabOverdue(t.key), false)} overdue</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isDue ? (
          <>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={overdue}
                  onChange={(e) => (setOverdue(e.target.checked), setPage(1))}
                />
                Overdue only
              </label>
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
            <TableState
              loading={dues.loading}
              error={dues.error}
              empty={!dues.data?.data.length}
              emptyMessage={tab === 'income' ? 'Nobody owes you money right now.' : 'No bills to pay.'}
            >
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Due</th>
                    <th className="th">Category</th>
                    <th className="th">Project</th>
                    <th className="th">Description</th>
                    <th className="th text-right">Amount</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dues.data?.data.map((d) => (
                    <tr key={d.id}>
                      <td className="td whitespace-nowrap">
                        {date(d.due_date)}{' '}
                        {d.due_date < today() ? (
                          <Badge tone="red">Overdue</Badge>
                        ) : d.due_date === today() ? (
                          <Badge tone="amber">Today</Badge>
                        ) : null}
                        {d.recurring_id && <Badge tone="blue">Recurring</Badge>}
                      </td>
                      <td className="td">{d.category_name}</td>
                      <td className="td">{d.project_name ?? '—'}</td>
                      <td className="td max-w-xs truncate text-slate-500">{d.description || '—'}</td>
                      <td className="td text-right font-medium">
                        <Amount value={d.amount} type={d.type} />
                      </td>
                      <td className="td text-right whitespace-nowrap">
                        <IconButton
                          label={d.type === 'income' ? 'Mark received' : 'Mark paid'}
                          className="text-emerald-600"
                          onClick={() =>
                            setModal({
                              kind: 'pay',
                              due: d,
                              accountId: d.account_id ?? '',
                              amount: d.amount,
                              date: today(),
                            })
                          }
                        >
                          <CheckCircle2 className="size-4" />
                        </IconButton>
                        <IconButton label="Edit" onClick={() => setModal({ kind: 'due', item: fromRow(d) })}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton
                          label="Delete"
                          onClick={() => remove('dues', d.id, `this item of ${money(d.amount)}`)}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableState>
            {dues.data && <Pagination {...dues.data} onChange={setPage} />}
          </>
        ) : (
          <TableState
            loading={recurring.loading}
            error={recurring.error}
            empty={!recurring.data?.length}
            emptyMessage="No recurring entries. Add hosting, subscriptions or retainers so they appear as dues automatically."
          >
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Repeats</th>
                  <th className="th">Category</th>
                  <th className="th">Description</th>
                  <th className="th">Last created</th>
                  <th className="th text-right">Amount</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurring.data?.map((r) => (
                  <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                    <td className="td whitespace-nowrap">
                      {label(r.frequency)} from {date(r.start_date)} {!r.is_active && <Badge>Paused</Badge>}
                    </td>
                    <td className="td">{r.category_name}</td>
                    <td className="td max-w-xs truncate text-slate-500">{r.description || '—'}</td>
                    <td className="td">{date(r.last_date)}</td>
                    <td className="td text-right font-medium">
                      <Amount value={r.amount} type={r.type} />
                    </td>
                    <td className="td text-right whitespace-nowrap">
                      <IconButton
                        label="Edit"
                        onClick={() => setModal({ kind: 'recurring', item: fromRow(r) })}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Delete"
                        onClick={() => remove('recurring', r.id, 'this recurring entry')}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableState>
        )}
      </Card>

      {modal?.kind === 'pay' && (
        <FormModal
          open
          title={modal.due.type === 'income' ? 'Mark as received' : 'Mark as paid'}
          submitLabel="Record transaction"
          onClose={() => setModal(null)}
          onSubmit={() => save(modal)}
        >
          <p className="text-sm text-slate-500">
            This records a real {modal.due.type} in the chosen account and removes it from dues.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (LKR)">
              <AmountInput value={modal.amount} onChange={(v) => setModal({ ...modal, amount: v })} />
            </Field>
            <Field label={modal.due.type === 'income' ? 'Received on' : 'Paid on'}>
              <input
                type="date"
                className="input"
                required
                value={modal.date}
                onChange={(e) => setModal({ ...modal, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label={modal.due.type === 'income' ? 'Received in account' : 'Paid from account'}>
            <AccountSelect
              accounts={accounts}
              value={modal.accountId}
              onChange={(v) => setModal({ ...modal, accountId: v })}
            />
          </Field>
        </FormModal>
      )}

      {modal && modal.kind !== 'pay' && (
        <FormModal
          open
          title={`${modal.item.id ? 'Edit' : 'New'} ${modal.kind === 'recurring' ? 'recurring entry' : modal.item.type === 'income' ? 'receivable' : 'bill'}`}
          onClose={() => setModal(null)}
          onSubmit={() => save(modal)}
        >
          {(() => {
            const i = modal.item;
            const set = (patch: Partial<Item>) => setModal({ ...modal, item: { ...i, ...patch } });
            return (
              <>
                {(modal.kind === 'recurring' || i.id) && (
                  <Field label="Type">
                    <select
                      className="input"
                      value={i.type}
                      onChange={(e) => set({ type: e.target.value as TxType, categoryId: '' })}
                    >
                      <option value="expense">Expense (to pay)</option>
                      <option value="income">Income (to receive)</option>
                    </select>
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Amount (LKR)">
                    <AmountInput value={i.amount} onChange={(v) => set({ amount: v })} />
                  </Field>
                  <Field label={modal.kind === 'recurring' ? 'First due date' : 'Due date'}>
                    <input
                      type="date"
                      className="input"
                      required
                      value={i.date}
                      onChange={(e) => set({ date: e.target.value })}
                    />
                  </Field>
                </div>
                {modal.kind === 'recurring' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Repeats">
                      <select
                        className="input"
                        value={i.frequency}
                        onChange={(e) => set({ frequency: e.target.value as Item['frequency'] })}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        className="input"
                        value={i.isActive ? '1' : ''}
                        onChange={(e) => set({ isActive: !!e.target.value })}
                      >
                        <option value="1">Active</option>
                        <option value="">Paused</option>
                      </select>
                    </Field>
                  </div>
                )}
                <Field label="Category">
                  <CategorySelect
                    categories={categories}
                    type={i.type}
                    value={i.categoryId}
                    onChange={(v) => set({ categoryId: v })}
                  />
                </Field>
                <Field label="Account (optional)">
                  <AccountSelect
                    accounts={accounts}
                    optional
                    value={i.accountId}
                    currentId={i.accountId}
                    onChange={(v) => set({ accountId: v })}
                  />
                </Field>
                <Field label="Project (optional)">
                  <ProjectSelect
                    projects={projects}
                    value={i.projectId}
                    onChange={(v) => set({ projectId: v })}
                  />
                </Field>
                <Field
                  label={
                    i.type === 'income'
                      ? 'Description (client, invoice no.)'
                      : 'Description (supplier, bill no.)'
                  }
                >
                  <input
                    className="input"
                    maxLength={1000}
                    value={i.description}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </Field>
              </>
            );
          })()}
        </FormModal>
      )}
    </>
  );
}
