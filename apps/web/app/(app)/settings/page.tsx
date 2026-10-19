'use client';

import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useConfirm, useToast } from '@/components/feedback';
import { Button, Card, Field, FormModal, IconButton, PageHeader, TableState } from '@/components/ui';
import { api, useApi } from '@/lib/api';
import type { Category, TxType } from '@/lib/types';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChangePassword />
        <div className="xl:col-span-2">
          <Categories />
        </div>
      </div>
    </>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return toast('New passwords do not match', 'error');
    setSaving(true);
    try {
      await api('/auth/change-password', 'POST', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Change password</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password">
          <input
            type="password"
            className="input"
            required
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <input
            type="password"
            className="input"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            className="input"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
        <Button type="submit" loading={saving}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

function Categories() {
  const toast = useToast();
  const confirm = useConfirm();
  const categories = useApi<Category[]>('/categories');
  const [form, setForm] = useState<{ id?: string; name: string; type: TxType } | null>(null);

  async function remove(c: Category) {
    if (!(await confirm(`Delete category "${c.name}"?`))) return;
    try {
      await api(`/categories/${c.id}`, 'DELETE');
      toast('Category deleted');
      categories.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-semibold text-slate-900">Categories</h2>
        <Button onClick={() => setForm({ name: '', type: 'income' })}>
          <Plus className="size-4" /> New category
        </Button>
      </div>
      <TableState
        loading={categories.loading}
        error={categories.error}
        empty={!categories.data?.length}
        emptyMessage="No categories yet."
      >
        <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
          {(['income', 'expense'] as const).map((type) => (
            <div key={type}>
              <h3
                className={`px-5 py-3 text-xs font-semibold tracking-wide uppercase ${type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {type === 'income' ? 'Income' : 'Expense'} categories
              </h3>
              <ul className="divide-y divide-slate-100">
                {categories.data
                  ?.filter((c) => c.type === type)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-5 py-2 text-sm">
                      <span>
                        {c.name}
                        <span className="ml-2 text-xs text-slate-400">{c.usage_count} used</span>
                      </span>
                      <span>
                        <IconButton
                          label="Rename"
                          onClick={() => setForm({ id: c.id, name: c.name, type: c.type })}
                        >
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton
                          label="Delete"
                          onClick={() => remove(c)}
                          disabled={c.usage_count > 0}
                          className="disabled:opacity-30"
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </TableState>
      {form && (
        <FormModal
          open
          title={form.id ? 'Edit category' : 'New category'}
          onClose={() => setForm(null)}
          onSubmit={async () => {
            if (form.id) await api(`/categories/${form.id}`, 'PUT', { name: form.name, type: form.type });
            else await api('/categories', 'POST', { name: form.name, type: form.type });
            toast(form.id ? 'Category updated' : 'Category created');
            categories.reload();
          }}
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
              onChange={(e) => setForm({ ...form, type: e.target.value as TxType })}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
        </FormModal>
      )}
    </Card>
  );
}
