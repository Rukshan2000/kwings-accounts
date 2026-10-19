/** Formats a decimal string as LKR without converting to a float (amounts can exceed 2^53 cents). */
export function money(value: string | null | undefined, withCurrency = true) {
  const raw = (value ?? '0').trim();
  const negative = raw.startsWith('-');
  const [int, dec = ''] = raw.replace('-', '').split('.');
  const grouped = (int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = `${grouped}.${(dec + '00').slice(0, 2)}`;
  return `${negative && /[1-9]/.test(raw) ? '-' : ''}${withCurrency ? 'LKR ' : ''}${out}`;
}

export const isNegative = (value: string | null | undefined) =>
  !!value?.startsWith('-') && /[1-9]/.test(value);

export const percent = (value: string | null | undefined) =>
  value === null || value === undefined ? 'N/A' : `${value}%`;

export function date(value: string | null | undefined) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const pad = (n: number) => String(n).padStart(2, '0');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const startOfYear = () => `${new Date().getFullYear()}-01-01`;
export const startOfMonth = () => today().slice(0, 8) + '01';

export const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
