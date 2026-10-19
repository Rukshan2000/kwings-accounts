'use client';

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react';
import { isNegative, money } from '@/lib/format';
import { useToast } from './feedback';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.2)]',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm',
  danger: 'bg-red-600 text-white hover:brightness-110 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:outline-none ${className}`}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(27_27_24/0.04),0_8px_24px_-12px_rgb(27_27_24/0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-slate-900 sm:text-[2.25rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  neutral: { text: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
  green: { text: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
  red: { text: 'text-red-600', chip: 'bg-red-50 text-red-600' },
  blue: { text: 'text-blue-600', chip: 'bg-blue-50 text-blue-500' },
};

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: keyof typeof tones;
  hint?: string;
}) {
  return (
    <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</span>
        {icon && (
          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tones[tone].chip}`}>
            {icon}
          </span>
        )}
      </div>
      <div
        className={`mt-3 font-display text-[1.65rem] leading-tight font-medium tabular-nums ${tones[tone].text}`}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

/** Signed amount in green/red. */
export function Amount({ value, type }: { value: string; type?: 'income' | 'expense' }) {
  const red = type === 'expense' || isNegative(value);
  const green = type === 'income' || (!red && type === undefined && /[1-9]/.test(value));
  return (
    <span className={`tabular-nums ${red ? 'text-red-600' : green ? 'text-emerald-600' : ''}`}>
      {type === 'expense' ? '-' : ''}
      {money(value)}
    </span>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'blue' | 'amber';
}) {
  const map = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12 text-slate-400">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function Empty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center text-sm text-slate-500">
      <span className="grid size-14 place-items-center rounded-full bg-slate-100">
        <Inbox className="size-6 text-slate-400" />
      </span>
      {message}
      {action}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

/** Loading / error / empty states around a table. */
export function TableState({
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="p-4">
        <ErrorNote message={error} />
      </div>
    );
  if (loading && empty) return <Spinner />;
  if (empty) return <Empty message={emptyMessage} />;
  return (
    <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>{children}</div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <IconButton
          label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton
          label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-slate-800 shadow-2xl"
    >
      {open && (
        <>
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-display text-xl font-medium text-slate-900">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}

/** Modal with a form: handles the saving state and shows API errors as a toast. */
export function FormModal({
  open,
  onClose,
  title,
  submitLabel = 'Save',
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel?: string;
  onSubmit: () => Promise<void>;
  children: ReactNode;
}) {
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={submit}>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        aria-label="From date"
        className="input w-auto"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange(e.target.value, to)}
      />
      <span className="text-sm text-slate-400">to</span>
      <input
        type="date"
        aria-label="To date"
        className="input w-auto"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange(from, e.target.value)}
      />
    </div>
  );
}
