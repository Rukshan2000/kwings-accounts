import knexFactory from 'knex';
import bcrypt from 'bcryptjs';
import config from '../knexfile';

async function createAdmin(db: ReturnType<typeof knexFactory>) {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name = 'Administrator' } = process.env;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const existing = await db('users').where({ email: email.toLowerCase() }).first();
  if (existing)
    return console.log(`Admin ${email} already exists, skipping (change the password in Settings).`);
  await db('users').insert({
    name,
    email: email.toLowerCase(),
    password_hash: await bcrypt.hash(password, 12),
  });
  console.log(`Admin ${email} created.`);
}

async function main() {
  const command = process.argv[2];
  const db = knexFactory(config);
  try {
    if (command === 'migrate') {
      const [batch, files] = await db.migrate.latest();
      console.log(files.length ? `Batch ${batch}: ${files.join(', ')}` : 'Already up to date.');
    } else if (command === 'rollback') {
      const [batch, files] = await db.migrate.rollback();
      console.log(files.length ? `Rolled back batch ${batch}: ${files.join(', ')}` : 'Nothing to roll back.');
    } else if (command === 'seed') {
      await db.seed.run();
      console.log('Seeds applied.');
    } else if (command === 'create-admin') {
      await createAdmin(db);
    } else {
      throw new Error('Usage: db.ts migrate|rollback|seed|create-admin');
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
