import { createDatabase, pingDatabase } from '@infrastructure/database/knex';
import { migrateLatest, migrateRollback } from '@infrastructure/database/migrator';

describe('Database Infrastructure (Knex & Migrator)', () => {
  it('createDatabase creates a Knex instance with mysql2 client', () => {
    const db = createDatabase({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      name: 'db',
      pool: { min: 2, max: 10 },
      migrateOnStart: false,
    });

    expect(db).toBeDefined();
    expect(typeof db.raw).toBe('function');
    void db.destroy();
  });

  it('pingDatabase executes SELECT 1', async () => {
    const fakeDb = {
      raw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    await pingDatabase(fakeDb as any);
    expect(fakeDb.raw).toHaveBeenCalledWith('SELECT 1');
  });

  it('migrateLatest invokes db.migrate.latest and returns migration names', async () => {
    const fakeDb = {
      migrate: {
        latest: jest.fn().mockResolvedValue([1, ['20260101000000-create-learning-schema']]),
      },
    };

    const names = await migrateLatest(fakeDb as any);
    expect(names).toEqual(['20260101000000-create-learning-schema']);
  });

  it('migrateRollback invokes db.migrate.rollback and returns rolled back names', async () => {
    const fakeDb = {
      migrate: {
        rollback: jest.fn().mockResolvedValue([1, ['20260101000000-create-learning-schema']]),
      },
    };

    const names = await migrateRollback(fakeDb as any);
    expect(names).toEqual(['20260101000000-create-learning-schema']);
  });
});
