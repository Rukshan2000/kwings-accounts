'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { today } from '@/lib/format';
import type { Account, Project } from '@/lib/types';
import { Field, FormModal } from './ui';
import { useToast } from './feedback';

const AMOUNT_PATTERN = '\\d+(\\.\\d{1,2})?';

export function AmountInput({
  value,
  onChange,
  signed,
}: {
  value: string;
  onChange: (v: string) => void;
  signed?: boolean;
}) {
  return (
    <input
      className="input tabular-nums"
      inputMode="decimal"
      required
      placeholder="0.00"
      pattern={signed ? `-?${AMOUNT_PATTERN}` : AMOUNT_PATTERN}
      title="Number with up to 2 decimals"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/,/g, ''))}
    />
  );
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  currentId,
}: {
  accounts: Account[];
  value: string;
  onChange: (v: string) => void;
  currentId?: string;
}) {
  return (
    <select className="input" required value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select account</option>
      {accounts
        .filter((a) => a.is_active || a.id === currentId)
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.is_active ? '' : ' (archived)'}
          </option>
        ))}
    </select>
  );
}

export function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function TransferForm({
  open,
  onClose,
  onSaved,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  accounts: Account[];
}) {
  const toast = useToast();
  // One key per opened form: a double submit or retry can never create two transfers.
  const [form, setForm] = useState(() => blank());
  function blank() {
    return {
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      date: today(),
      description: '',
      idempotencyKey: crypto.randomUUID(),
    };
  }
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const close = () => {
    setForm(blank());
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={close}
      title="Transfer between accounts"
      submitLabel="Transfer"
      onSubmit={async () => {
        await api('/transfers', 'POST', form);
        toast('Transfer recorded');
        onSaved();
      }}
    >
      <Field label="From account">
        <AccountSelect
          accounts={accounts}
          value={form.fromAccountId}
          onChange={(v) => set({ fromAccountId: v })}
        />
      </Field>
      <Field label="To account">
        <AccountSelect
          accounts={accounts.filter((a) => a.id !== form.fromAccountId)}
          value={form.toAccountId}
          onChange={(v) => set({ toAccountId: v })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Amount (LKR)">
          <AmountInput value={form.amount} onChange={(v) => set({ amount: v })} />
        </Field>
        <Field label="Date">
          <input
            type="date"
            className="input"
            required
            value={form.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Description">
        <input
          className="input"
          maxLength={1000}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
    </FormModal>
  );
}
