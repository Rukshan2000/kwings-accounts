'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useConfirm, useToast } from '@/components/feedback';
import {
  Amount,
  Badge,
  Button,
  Card,
  Field,
  FormModal,
  IconButton,
  PageHeader,
  TableState,
} from '@/components/ui';
import { api, useApi } from '@/lib/api';
import { date, isNegative, label, money, percent } from '@/lib/format';
import type { Project } from '@/lib/types';

type Form = {
  id?: string;
  name: string;
  clientName: string;
  description: string;
  status: Project['status'];
  startDate: string;
};
const blank: Form = { name: '', clientName: '', description: '', status: 'active', startDate: '' };
const statusTone = { active: 'blue', completed: 'green', cancelled: 'slate' } as const;

function Pct({ value }: { value: string | null }) {
  return (
    <span
      className={value === null ? 'text-slate-400' : isNegative(value) ? 'text-red-600' : 'text-emerald-600'}
    >
      {percent(value)}
    </span>
  );
}

export default function ProjectsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const projects = useApi<Project[]>('/projects');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const list = (projects.data ?? []).filter((p) => !status || p.status === status);

  async function save(f: Form) {
    const body = {
      name: f.name,
      clientName: f.clientName,
      description: f.description,
      status: f.status,
      startDate: f.startDate || null,
    };
    if (f.id) await api(`/projects/${f.id}`, 'PUT', body);
    else await api('/projects', 'POST', body);
    toast(f.id ? 'Project updated' : 'Project created');
    projects.reload();
  }

  async function remove(p: Project) {
    if (!(await confirm(`Delete project "${p.name}"?`))) return;
    try {
      await api(`/projects/${p.id}`, 'DELETE');
      toast('Project deleted');
      projects.reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Profit = income − expenses · ROI = profit ÷ expenses × 100 · Investment ROI = (profit − investment) ÷ investment × 100"
        actions={
          <Button onClick={() => setForm(blank)}>
            <Plus className="size-4" /> New project
          </Button>
        }
      />
      <Card>
        <div className="flex gap-2 border-b border-slate-200 p-4">
          {['', 'active', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {s ? label(s) : 'All'}
            </button>
          ))}
        </div>
        <TableState
          loading={projects.loading}
          error={projects.error}
          empty={list.length === 0}
          emptyMessage="No projects yet."
        >
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Project</th>
                <th className="th">Status</th>
                <th className="th">Start</th>
                <th className="th text-right">Income</th>
                <th className="th text-right">Expenses</th>
                <th className="th text-right">Profit / Loss</th>
                <th className="th text-right">ROI</th>
                <th className="th text-right">Investment</th>
                <th className="th text-right">Inv. ROI</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="td">
                    <Link
                      href={`/transactions?projectId=${p.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-slate-500">{p.client_name || '—'}</div>
                  </td>
                  <td className="td">
                    <Badge tone={statusTone[p.status]}>{label(p.status)}</Badge>
                  </td>
                  <td className="td">{date(p.start_date)}</td>
                  <td className="td text-right tabular-nums text-emerald-600">{money(p.income)}</td>
                  <td className="td text-right tabular-nums text-red-600">{money(p.expenses)}</td>
                  <td className="td text-right font-semibold">
                    <Amount value={p.profit} />
                  </td>
                  <td className="td text-right">
                    <Pct value={p.roi} />
                  </td>
                  <td className="td text-right tabular-nums">{money(p.investment)}</td>
                  <td className="td text-right">
                    <Pct value={p.investmentRoi} />
                  </td>
                  <td className="td text-right">
                    <IconButton
                      label="Edit"
                      onClick={() =>
                        setForm({
                          id: p.id,
                          name: p.name,
                          clientName: p.client_name ?? '',
                          description: p.description ?? '',
                          status: p.status,
                          startDate: p.start_date ?? '',
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(p)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableState>
      </Card>

      {form && (
        <FormModal
          open
          title={form.id ? 'Edit project' : 'New project'}
          onClose={() => setForm(null)}
          onSubmit={() => save(form)}
        >
          <Field label="Project name">
            <input
              className="input"
              required
              maxLength={150}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Client name">
            <input
              className="input"
              maxLength={150}
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Project['status'] })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label="Start date">
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="input"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </FormModal>
      )}
    </>
  );
}
