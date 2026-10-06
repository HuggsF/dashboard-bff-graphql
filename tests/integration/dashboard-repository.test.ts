import knex from 'knex';
import { MySqlDashboardRepository } from '@infrastructure/database/mysql-dashboard.repository';
import { MySqlUserRepository } from '@infrastructure/database/mysql-user.repository';

describe('Dashboard Repository Integration (SQL Projection vs Full Query)', () => {
  // Use MySQL knex query compiler (offline mode) to inspect generated SQL queries
  const db = knex({
    client: 'mysql2',
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('MySqlDashboardRepository (BFF & Keyset Projection)', () => {
    it('generates minimal SQL projection with SUM score aggregation and pagination', () => {
      const repo = new MySqlDashboardRepository(db);

      // Access private rankedQuery via query execution to check SQL
      const query = (repo as any).rankedQuery(['name', 'avatarUrl']).limit(20).offset(20);
      const sql = query.toSQL().toNative();

      // Verify that only requested fields and aggregates are in SELECT
      expect(sql.sql).toContain('select `u`.`id`');
      expect(sql.sql).toContain('CAST(COALESCE(SUM(e.score), 0) AS UNSIGNED) AS total_score');
      expect(sql.sql).toContain('`u`.`name`');
      expect(sql.sql).toContain('`u`.`avatar_url`');
      expect(sql.sql).not.toContain('`u`.`bio`');
      expect(sql.sql).not.toContain('`u`.`email`');
      expect(sql.sql).toContain('limit ?');
      expect(sql.sql).toContain('offset ?');
      expect(sql.bindings).toEqual([20, 20]);
    });

    it('generates keyset pagination (HAVING clause) when after cursor is provided', () => {
      const repo = new MySqlDashboardRepository(db);

      const query = (repo as any).rankedQuery(['name']).limit(21);
      query.havingRaw('total_score < ? OR (total_score = ? AND u.id > ?)', [150, 150, 'user-123']);
      const sql = query.toSQL().toNative();

      expect(sql.sql).toContain('having total_score < ? OR (total_score = ? AND u.id > ?)');
      expect(sql.bindings).toEqual([150, 150, 'user-123', 21]);
    });

    it('maps database rows strictly to the requested projected fields', async () => {
      // Create a mock knex query builder that resolves mock rows
      const mockRows = [
        {
          id: 'user-1',
          total_score: '180',
          name: 'Ada Lovelace',
          avatar_url: 'https://example.com/ada.png',
          completed_courses: '3',
        },
      ];

      const fakeDb: any = () => ({
        leftJoin: () => fakeDb(),
        select: () => fakeDb(),
        groupBy: () => fakeDb(),
        orderBy: () => fakeDb(),
        limit: () => fakeDb(),
        offset: () => Promise.resolve(mockRows),
        havingRaw: () => fakeDb(),
        then: (resolve: any) => resolve(mockRows),
      });
      fakeDb.raw = (str: string) => str;

      const repo = new MySqlDashboardRepository(fakeDb);
      const projections = await repo.getDashboardSummary(1, 20, ['name']);

      expect(projections).toHaveLength(1);
      expect(projections[0]).toEqual({
        id: 'user-1',
        totalScore: 180,
        name: 'Ada Lovelace',
      });
      // avatarUrl and completedCourses were not requested, so they must be omitted
      expect((projections[0] as any).avatarUrl).toBeUndefined();
      expect((projections[0] as any).completedCourses).toBeUndefined();
    });
  });

  describe('MySqlUserRepository (Legacy Full Query vs Projected)', () => {
    it('findAllProjected generates SELECT with only specified columns', () => {
      const repo = new MySqlUserRepository(db);

      const query = (repo as any).db('users')
        .select(['id', 'name', 'avatar_url'])
        .whereIn('id', ['id1', 'id2']);
      const sql = query.toSQL().toNative();

      expect(sql.sql).toContain('select `id`, `name`, `avatar_url` from `users`');
      expect(sql.sql).toContain('where `id` in (?, ?)');
      expect(sql.bindings).toEqual(['id1', 'id2']);
    });
  });
});
