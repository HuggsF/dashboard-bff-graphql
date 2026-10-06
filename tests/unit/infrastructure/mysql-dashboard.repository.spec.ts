import { MySqlDashboardRepository } from '@infrastructure/database/mysql-dashboard.repository';

describe('MySqlDashboardRepository Unit', () => {
  const mockRow = {
    id: 'user-1',
    total_score: '100',
    name: 'Ada',
    avatar_url: null,
    completed_courses: '2',
  };

  it('getDashboardSummary queries with projections including completedCourses', async () => {
    const fakeQuery: any = {
      leftJoin: () => fakeQuery,
      select: () => fakeQuery,
      groupBy: () => fakeQuery,
      orderBy: () => fakeQuery,
      limit: () => fakeQuery,
      offset: () => Promise.resolve([mockRow]),
    };
    const fakeDb: any = () => fakeQuery;
    fakeDb.raw = (str: string) => str;

    const repo = new MySqlDashboardRepository(fakeDb);
    const result = await repo.getDashboardSummary(1, 10, ['name', 'avatarUrl', 'completedCourses']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'user-1',
      totalScore: 100,
      name: 'Ada',
      avatarUrl: null,
      completedCourses: 2,
    });
  });

  it('getDashboardSummaryAfter applies havingRaw when after cursor is provided', async () => {
    let havingApplied = false;
    const fakeQuery: any = {
      leftJoin: () => fakeQuery,
      select: () => fakeQuery,
      groupBy: () => fakeQuery,
      orderBy: () => fakeQuery,
      limit: () => fakeQuery,
      havingRaw: () => {
        havingApplied = true;
        return fakeQuery;
      },
      then: (resolve: any) => resolve([mockRow]),
    };
    const fakeDb: any = () => fakeQuery;
    fakeDb.raw = (str: string) => str;

    const repo = new MySqlDashboardRepository(fakeDb);
    const result = await repo.getDashboardSummaryAfter({ totalScore: 150, id: 'u0' }, 10, ['name']);

    expect(havingApplied).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Ada');
  });

  it('getDashboardSummaryAfter does not apply havingRaw when after cursor is null', async () => {
    let havingApplied = false;
    const fakeQuery: any = {
      leftJoin: () => fakeQuery,
      select: () => fakeQuery,
      groupBy: () => fakeQuery,
      orderBy: () => fakeQuery,
      limit: () => fakeQuery,
      havingRaw: () => {
        havingApplied = true;
        return fakeQuery;
      },
      then: (resolve: any) => resolve([mockRow]),
    };
    const fakeDb: any = () => fakeQuery;
    fakeDb.raw = (str: string) => str;

    const repo = new MySqlDashboardRepository(fakeDb);
    await repo.getDashboardSummaryAfter(null, 10, ['name']);

    expect(havingApplied).toBe(false);
  });
});
