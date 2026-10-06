import * as migration from '@infrastructure/database/migrations/20260101000000-create-learning-schema';

describe('Learning Schema Migration', () => {
  it('exports migration name', () => {
    expect(migration.name).toBe('20260101000000_create_learning_schema');
  });

  it('runs up migration creating six tables and constraints', async () => {
    const createdTables: string[] = [];
    const fakeTable: any = {
      uuid: () => fakeTable,
      primary: () => fakeTable,
      string: () => fakeTable,
      notNullable: () => fakeTable,
      nullable: () => fakeTable,
      unique: () => fakeTable,
      text: () => fakeTable,
      datetime: () => fakeTable,
      defaultTo: () => fakeTable,
      smallint: () => fakeTable,
      tinyint: () => fakeTable,
      unsigned: () => fakeTable,
      references: () => fakeTable,
      inTable: () => fakeTable,
      withKeyName: () => fakeTable,
      onDelete: () => fakeTable,
      index: () => fakeTable,
    };

    const fakeKnex: any = {
      schema: {
        createTable: jest.fn().mockImplementation((tableName: string, callback: any) => {
          createdTables.push(tableName);
          callback(fakeTable);
          return Promise.resolve();
        }),
      },
      raw: jest.fn().mockResolvedValue([]),
      fn: { now: () => 'NOW()' },
    };

    await migration.up(fakeKnex);

    expect(createdTables).toEqual([
      'users',
      'instructors',
      'courses',
      'modules',
      'enrollments',
      'certificates',
    ]);
    expect(fakeKnex.raw).toHaveBeenCalledWith(
      expect.stringContaining('ALTER TABLE enrollments ADD CONSTRAINT'),
    );
  });

  it('runs down migration dropping all tables', async () => {
    const droppedTables: string[] = [];
    const fakeKnex: any = {
      schema: {
        dropTableIfExists: jest.fn().mockImplementation((tableName: string) => {
          droppedTables.push(tableName);
          return Promise.resolve();
        }),
      },
    };

    await migration.down(fakeKnex);

    expect(droppedTables).toEqual([
      'certificates',
      'enrollments',
      'modules',
      'courses',
      'instructors',
      'users',
    ]);
  });
});
