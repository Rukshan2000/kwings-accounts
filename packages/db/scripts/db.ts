import knexFactory from 'knex';
import config from '../knexfile';

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
    } else {
      throw new Error('Usage: db.ts migrate|rollback|seed');
    }
  } finally {
    await db.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
