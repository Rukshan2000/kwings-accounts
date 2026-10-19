import type { Knex } from 'knex';

const income = [
  'Website Development',
  'Software Development',
  'Maintenance',
  'Hosting',
  'Consulting',
  'Other Income',
];
const expense = [
  'Hosting',
  'Domains',
  'Software Subscriptions',
  'Marketing',
  'Salaries',
  'Office Expenses',
  'Transport',
  'Other Expenses',
];

// Idempotent: safe to run on every deploy.
export async function seed(knex: Knex): Promise<void> {
  const rows = [
    ...income.map((name) => ({ name, type: 'income' })),
    ...expense.map((name) => ({ name, type: 'expense' })),
  ];
  await knex('categories').insert(rows).onConflict(['name', 'type']).ignore();
}
