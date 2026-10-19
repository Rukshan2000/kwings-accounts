import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const opt = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());
const nullable = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), schema.nullable());

const decimalString = (pattern: RegExp, message: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .pipe(z.string().regex(pattern, message));

/** Positive money amount, max 16 integer digits and 2 decimals (NUMERIC(18,2)). Kept as a string. */
export const amount = decimalString(
  /^\d{1,16}(\.\d{1,2})?$/,
  'Enter a valid amount (up to 2 decimals)',
).refine((v) => /[1-9]/.test(v), 'Amount must be greater than zero');
const signedAmount = decimalString(/^-?\d{1,16}(\.\d{1,2})?$/, 'Enter a valid amount (up to 2 decimals)');

const date = z.iso.date({ message: 'Use a valid date (YYYY-MM-DD)' });
const id = z.uuid({ message: 'Invalid id' });
const text = (max: number) => z.string().trim().min(1, 'Required').max(max);
const optionalText = (max: number) => nullable(z.string().trim().max(max));

export const idParam = z.object({ id });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const accountSchema = z.object({
  name: text(100),
  type: z.enum(['cash', 'bank', 'wallet', 'other']),
  openingBalance: signedAmount.default('0'),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({ name: text(100), type: z.enum(['income', 'expense']) });

export const projectSchema = z.object({
  name: text(150),
  clientName: optionalText(150),
  description: optionalText(2000),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  startDate: nullable(date),
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  accountId: id,
  categoryId: id,
  projectId: nullable(id),
  amount,
  description: optionalText(1000),
  date,
});

export const transferSchema = z
  .object({
    fromAccountId: id,
    toAccountId: id,
    amount,
    description: optionalText(1000),
    date,
    idempotencyKey: id,
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: 'Cannot transfer to the same account',
    path: ['toAccountId'],
  });

export const investmentSchema = z.object({
  name: text(150),
  accountId: id,
  projectId: nullable(id),
  amount,
  description: optionalText(1000),
  date,
});

export const rangeQuery = z
  .object({ from: opt(date), to: opt(date) })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: '"From" must be before "To"',
    path: ['from'],
  });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  q: opt(z.string().trim().max(200)),
  from: opt(date),
  to: opt(date),
  type: opt(z.enum(['income', 'expense'])),
  accountId: opt(id),
  categoryId: opt(id),
  projectId: opt(id),
});

export const reportQuery = z.object({
  from: opt(date),
  to: opt(date),
  categoryId: opt(id),
  projectId: opt(id),
  format: opt(z.enum(['json', 'csv'])),
});

export type Range = { from?: string; to?: string };
