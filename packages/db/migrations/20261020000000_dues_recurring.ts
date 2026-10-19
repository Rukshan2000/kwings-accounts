import type { Knex } from 'knex';

const money = (t: Knex.CreateTableBuilder, name: string) => t.decimal(name, 18, 2).notNullable();

/** Shared columns of a pending item and its recurring template. */
function itemColumns(knex: Knex, t: Knex.CreateTableBuilder, table: string) {
  t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
  t.text('type').notNullable();
  // Expected account; the actual one is picked when the item is paid.
  t.uuid('account_id').references('accounts.id').onDelete('RESTRICT');
  t.uuid('category_id').notNullable().references('categories.id').onDelete('RESTRICT');
  t.uuid('project_id').references('projects.id').onDelete('RESTRICT');
  money(t, 'amount');
  t.text('description');
  t.timestamps(true, true);
  t.check(`type in ('income','expense')`, [], `${table}_type_check`);
  t.check('amount > 0', [], `${table}_amount_check`);
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recurring', (t) => {
    itemColumns(knex, t, 'recurring');
    t.text('frequency').notNullable();
    t.date('start_date').notNullable();
    // Latest occurrence already turned into a due item; later occurrences are still to generate.
    t.date('last_date');
    t.boolean('is_active').notNullable().defaultTo(true);
    t.check(`frequency in ('weekly','monthly','yearly')`, [], 'recurring_frequency_check');
  });

  // Money owed to us (income) or by us (expense) that has not moved yet.
  // Not part of balances or profit until paid, when it becomes a transaction.
  await knex.schema.createTable('dues', (t) => {
    itemColumns(knex, t, 'dues');
    t.date('due_date').notNullable();
    t.uuid('recurring_id').references('recurring.id').onDelete('SET NULL');
    t.unique(['recurring_id', 'due_date']);
    t.index(['type', 'due_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dues');
  await knex.schema.dropTableIfExists('recurring');
}
