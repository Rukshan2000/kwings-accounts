import type { Knex } from 'knex';

const money = (t: Knex.CreateTableBuilder, name: string) => t.decimal(name, 18, 2).notNullable();

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('email').notNullable().unique();
    t.text('password_hash').notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('accounts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable().unique();
    t.text('type').notNullable();
    money(t, 'opening_balance').defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.check(`type in ('cash','bank','wallet','other')`, [], 'accounts_type_check');
  });

  await knex.schema.createTable('categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('type').notNullable();
    t.timestamps(true, true);
    t.unique(['name', 'type']);
    t.check(`type in ('income','expense')`, [], 'categories_type_check');
  });

  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('client_name');
    t.text('description');
    t.text('status').notNullable().defaultTo('active');
    t.date('start_date');
    t.timestamps(true, true);
    t.check(`status in ('active','completed','cancelled')`, [], 'projects_status_check');
  });

  await knex.schema.createTable('transactions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('account_id').notNullable().references('accounts.id').onDelete('RESTRICT');
    t.uuid('category_id').notNullable().references('categories.id').onDelete('RESTRICT');
    t.uuid('project_id').references('projects.id').onDelete('RESTRICT');
    t.text('type').notNullable();
    money(t, 'amount');
    t.text('description');
    t.date('transaction_date').notNullable();
    t.timestamps(true, true);
    t.check(`type in ('income','expense')`, [], 'transactions_type_check');
    t.check('amount > 0', [], 'transactions_amount_check');
    t.index(['transaction_date']);
    t.index(['account_id']);
    t.index(['category_id']);
    t.index(['project_id']);
    t.index(['type', 'transaction_date']);
  });

  await knex.schema.createTable('transfers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('from_account_id').notNullable().references('accounts.id').onDelete('RESTRICT');
    t.uuid('to_account_id').notNullable().references('accounts.id').onDelete('RESTRICT');
    money(t, 'amount');
    t.text('description');
    t.date('transfer_date').notNullable();
    // Client-generated key; a repeated request with the same key returns the original transfer.
    t.uuid('idempotency_key').unique();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.check('amount > 0', [], 'transfers_amount_check');
    t.check('from_account_id <> to_account_id', [], 'transfers_distinct_accounts_check');
    t.index(['from_account_id']);
    t.index(['to_account_id']);
    t.index(['transfer_date']);
  });

  await knex.schema.createTable('investments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('account_id').notNullable().references('accounts.id').onDelete('RESTRICT');
    t.uuid('project_id').references('projects.id').onDelete('RESTRICT');
    t.text('name').notNullable();
    money(t, 'amount');
    t.text('description');
    t.date('investment_date').notNullable();
    t.timestamps(true, true);
    t.check('amount > 0', [], 'investments_amount_check');
    t.index(['account_id']);
    t.index(['project_id']);
    t.index(['investment_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  for (const table of [
    'investments',
    'transfers',
    'transactions',
    'projects',
    'categories',
    'accounts',
    'users',
  ]) {
    await knex.schema.dropTableIfExists(table);
  }
}
