/**
 *   npm run migrate              # apply pending migrations
 *   npm run migrate:rollback     # revert the last batch
 */
import '../src/module-aliases';
import { parseArgs } from 'node:util';
import { loadConfig, loadEnvFile } from '@infrastructure/config/env';
import { createDatabase } from '@infrastructure/database/knex';
import { migrateLatest, migrateRollback } from '@infrastructure/database/migrator';

const main = async (): Promise<void> => {
  const { values } = parseArgs({ options: { rollback: { type: 'boolean' } } });
  loadEnvFile();
  const db = createDatabase(loadConfig().database);
  try {
    const rollback = values.rollback === true;
    const names = rollback ? await migrateRollback(db) : await migrateLatest(db);
    const verb = rollback ? 'Rolled back' : 'Applied';
    process.stdout.write(
      names.length === 0
        ? 'Database already up to date\n'
        : `${verb} ${names.length} migration(s):\n${names.map((name) => `  - ${name}`).join('\n')}\n`,
    );
  } finally {
    await db.destroy();
  }
};

main().catch((error: unknown) => {
  process.stderr.write(
    `Migration failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
