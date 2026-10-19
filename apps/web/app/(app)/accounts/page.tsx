'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Archive, ArchiveRestore, ArrowLeftRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useConfirm, useToast } from '@/components/feedback';
import { AmountInput, TransferForm } from '@/components/forms';
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
  StatCard,
  TableState,
} from '@/components/ui';
import { api, qs, useApi } from '@/lib/api';
import { date, label, money } from '@/lib/format';
import type { Account, Page, Transfer } from '@/lib/types';

type AccountForm = {
  id?: string;
  name: string;
  type: Account['type'];
  openingBalance: string;
  isActive: boolean;
};
const blank: AccountForm = { name: '', type: 'bank', openingBalance: '0.00', isActive: true };

export default function AccountsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const accounts = useApi<Account[]>('/accounts');
  const total = useApi<{ total: string }>('/accounts/total');
  const [transferPage, setTransferPage] = useState(1);
  const transfers = useApi<Page<Transfer>>(`/transfers${qs({ page: transferPage, pageSize: 10 })}`);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<AccountForm | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const list = (accounts.data ?? []).filter((a) => showArchived || a.is_active);
  const active = (accounts.data ?? []).filter((a) => a.is_active);
  const reloadAccounts = () => Promise.all([accounts.reload(), total.reload()]);
  const reloadAll = () => Promise.all([reloadAccounts(), transfers.reload()]);

  async function save(f: AccountForm) {
    const body = { name: f.name, type: f.type, openingBalance: f.openingBalance, isActive: f.isActive };
    if (f.id) await api(`/accounts/${f.id}`, 'PUT', body);
    else await api('/accounts', 'POST', body);
    toast(f.id ? 'Account updated' : 'Account created');
    reloadAccounts();
  }

  async function toggleArchive(a: Account) {
    try {
      await api(`/accounts/${a.id}`, 'PUT', {
        name: a.name,
        type: a.type,
        openingBalance: a.opening_balance,
        isActive: !a.is_active,
      });
      toast(a.is_active ? 'Account archived' : 'Account restored');
      reloadAccounts();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function remove(a: Account) {
    if (!(await confirm(`Delete account "${a.name}"? Accounts with records can only be archived.`))) return;
    try {
      await api(`/accounts/${a.id}`, 'DELETE');
      toast('Account deleted');
      reloadAccounts();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  async function removeTransfer(t: Transfer) {
    if (
      !(await confirm(
        `Delete the transfer of ${money(t.amount)} from ${t.from_account_name} to ${t.to_account_name}?`,
      ))
    )
      return;
    try {
      await api(`/transfers/${t.id}`, 'DELETE');
      toast('Transfer deleted');
      reloadAll();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Balance = opening + income − expenses + transfers in − transfers out − investments"
        actions={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="size-4" /> Transfer
            </Button>
            <Button onClick={() => setForm(blank)}>
              <Plus className="size-4" /> New account
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total balance"
          tone="blue"
          value={total.data ? money(total.data.total) : '…'}
          hint="All accounts"
        />
        <StatCard label="Active accounts" value={String(active.length)} />
        <StatCard label="Archived accounts" value={String((accounts.data?.length ?? 0) - active.length)} />
      </div>

      <Card>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display text-lg font-medium text-slate-900">All accounts</h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{' '}
            Show archived
          </label>
        </div>
        <TableState
          loading={accounts.loading}
          error={accounts.error}
          empty={list.length === 0}
          emptyMessage="No accounts yet. Create your first account."
        >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Account</th>
                <th className="th">Type</th>
                <th className="th text-right">Opening</th>
                <th className="th text-right">Current balance</th>
                <th className="th">Status</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="td font-medium">
                    <Link href={`/accounts/${a.id}`} className="text-blue-700 hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="td">{label(a.type)}</td>
                  <td className="td text-right tabular-nums">{money(a.opening_balance)}</td>
                  <td className="td text-right font-semibold">
                    <Amount value={a.balance} />
                  </td>
                  <td className="td">
                    {a.is_active ? <Badge tone="green">Active</Badge> : <Badge>Archived</Badge>}
                  </td>
                  <td className="td text-right">
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setForm({
                          id: a.id,
                          name: a.name,
                          type: a.type,
                          openingBalance: a.opening_balance,
                          isActive: a.is_active,
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={a.is_active ? 'Archive' : 'Restore'} onClick={() => toggleArchive(a)}>
                      {a.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(a)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </Card>

      <Card className="mt-6">
        <h2 className="px-5 py-4 font-display text-lg font-medium text-slate-900">Transfers</h2>
        <TableState
          loading={transfers.loading}
          error={transfers.error}
          empty={!transfers.data?.data.length}
          emptyMessage="No transfers yet. Transfers move money between accounts without affecting profit."
        >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">From</th>
                <th className="th">To</th>
                <th className="th">Description</th>
                <th className="th text-right">Amount</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.data?.data.map((t) => (
                <tr key={t.id}>
                  <td className="td">{date(t.transfer_date)}</td>
                  <td className="td">{t.from_account_name}</td>
                  <td className="td">{t.to_account_name}</td>
                  <td className="td max-w-xs truncate text-slate-500">{t.description || '—'}</td>
                  <td className="td text-right font-medium tabular-nums">{money(t.amount)}</td>
                  <td className="td text-right">
                    <IconButton label="Delete transfer" onClick={() => removeTransfer(t)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
        {transfers.data && <Pagination {...transfers.data} onChange={setTransferPage} />}
      </Card>

      {form && (
        <FormModal
          open
          title={form.id ? 'Edit account' : 'New account'}
          onClose={() => setForm(null)}
          onSubmit={() => save(form)}
        >
          <Field label="Name">
            <input
              className="input"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Account['type'] })}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">Digital wallet</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Opening balance (LKR)" hint="Balance before the first recorded transaction.">
            <AmountInput
              signed
              value={form.openingBalance}
              onChange={(v) => setForm({ ...form, openingBalance: v })}
            />
          </Field>
        </FormModal>
      )}
      <TransferForm
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSaved={reloadAll}
        accounts={accounts.data ?? []}
      />
    </>
  );
}
