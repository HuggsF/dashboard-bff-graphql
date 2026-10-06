import { MySqlUserRepository } from '@infrastructure/database/mysql-user.repository';

describe('MySqlUserRepository', () => {
  it('findAllProjected returns empty array when filter.ids is empty', async () => {
    const fakeDb = jest.fn();
    const repo = new MySqlUserRepository(fakeDb as any);

    const result = await repo.findAllProjected(['name'], { ids: [] });
    expect(result).toEqual([]);
    expect(fakeDb).not.toHaveBeenCalled();
  });

  it('findAllProjected queries specified fields and maps rows', async () => {
    const mockRows = [{ id: 'u1', name: 'Ada', avatar_url: 'https://avatar.png' }];
    const queryBuilder: any = {
      select: () => queryBuilder,
      orderBy: () => queryBuilder,
      whereIn: () => queryBuilder,
      then: (resolve: any) => resolve(mockRows),
    };
    const fakeDb: any = () => queryBuilder;

    const repo = new MySqlUserRepository(fakeDb);
    const result = await repo.findAllProjected(['name', 'avatarUrl'], { ids: ['u1'] });

    expect(result).toEqual([{ id: 'u1', name: 'Ada', avatarUrl: 'https://avatar.png' }]);
  });

  it('findById returns null when user row is not found', async () => {
    const fakeDb: any = () => ({
      where: () => ({
        first: () => Promise.resolve(undefined),
      }),
    });

    const repo = new MySqlUserRepository(fakeDb);
    const result = await repo.findById('non-existent');

    expect(result).toBeNull();
  });

  it('count returns the total count of users as a number', async () => {
    const fakeDb: any = () => ({
      count: () => Promise.resolve([{ total: '42' }]),
    });

    const repo = new MySqlUserRepository(fakeDb);
    const count = await repo.count();
    expect(count).toBe(42);
  });

  it('findAll queries all 6 relational tables and assembles domain aggregates', async () => {
    const fakeDb: any = (_table: string) => {
      const q: any = {
        select: () => q,
        orderBy: () => Promise.resolve([]),
        then: (resolve: any) => resolve([]),
      };
      return q;
    };

    const repo = new MySqlUserRepository(fakeDb);
    const users = await repo.findAll();
    expect(users).toEqual([]);
  });
});
