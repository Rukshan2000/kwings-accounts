import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

// Creates the first login from ADMIN_EMAIL / ADMIN_PASSWORD. Never overwrites an existing user,
// so passwords changed in Settings survive every deploy. More users are added in Settings → Users.
export async function seed(knex: Knex): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Administrator' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set: skipping admin user seed.');
    return;
  }
  if (ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const inserted = await knex('users')
    .insert({ name: ADMIN_NAME, email, password_hash: await bcrypt.hash(ADMIN_PASSWORD, 12) })
    .onConflict('email')
    .ignore()
    .returning('id');
  console.log(inserted.length ? `Admin user ${email} created.` : `Admin user ${email} already exists.`);
}
