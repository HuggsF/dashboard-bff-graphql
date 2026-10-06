/**
 * Seeds the database with the SPEC volumes (1,000 users, 5,000 enrollments, 200 courses,
 * 50 instructors, 1,000 modules, 3,000 certificates). Deterministic: same seed, same bytes.
 *
 *   npm run seed                  # migrate, wipe, insert
 *   npm run seed -- --if-empty    # only when the users table is empty (docker-compose start)
 *   npm run seed -- --seed 7      # another deterministic dataset
 */
import '../src/module-aliases';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { loadConfig, loadEnvFile } from '@infrastructure/config/env';
import { createDatabase } from '@infrastructure/database/knex';
import { migrateLatest } from '@infrastructure/database/migrator';
import { TABLES } from '@infrastructure/database/tables';
import { clearDataset, countDataset, insertDataset } from './lib/dataset';
import { generateDataset, loadFaker } from './lib/faker-dataset';

const optionsSchema = z.object({
  'if-empty': z.boolean().default(false),
  seed: z.coerce.number().int().nonnegative().default(42),
});

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    options: { 'if-empty': { type: 'boolean' }, seed: { type: 'string' } },
  });
  const options = optionsSchema.parse(values);
  loadEnvFile();
  const db = createDatabase(loadConfig().database);

  try {
    const applied = await migrateLatest(db);
    process.stdout.write(`Migrations applied: ${applied.length === 0 ? 'none' : applied.join(', ')}\n`);

    const [row] = await db(TABLES.users).count<{ total: number | string }[]>({ total: '*' });
    const existing = Number(row?.total ?? 0);
    if (options['if-empty'] && existing > 0) {
      process.stdout.write(`Seed skipped: ${existing} users already present\n`);
      return;
    }

    const startedAt = performance.now();
    const dataset = generateDataset(await loadFaker(), options.seed);
    await clearDataset(db);
    await insertDataset(db, dataset);
    const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);

    process.stdout.write(`Seeded in ${seconds}s (seed ${options.seed}):\n`);
    for (const [table, count] of Object.entries(countDataset(dataset))) {
      process.stdout.write(`  ${table.padEnd(13)} ${count.toLocaleString('en-US').padStart(6)}\n`);
    }
  } finally {
    await db.destroy();
  }
};

main().catch((error: unknown) => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
