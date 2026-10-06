import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { GetDashboardGraphQLUseCase } from '@application/use-cases/get-dashboard-graphql.use-case';

describe('GetDashboardGraphQLUseCase', () => {
  const sampleRows = [
    {
      id: '01990001-0000-7000-8000-000000000001',
      name: 'Ada Lovelace',
      totalScore: 100,
      avatarUrl: 'https://example.com/ada.png',
      completedCourses: 2,
    },
    {
      id: '01990001-0000-7000-8000-000000000002',
      name: 'Alan Turing',
      totalScore: 90,
      avatarUrl: null,
      completedCourses: 1,
    },
  ];

  it('performs keyset pagination with cursor and requests fields', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
      getDashboardSummaryAfter: jest.fn().mockResolvedValue([
        ...sampleRows,
        {
          id: '01990001-0000-7000-8000-000000000003',
          name: 'Grace Hopper',
          totalScore: 85,
        },
      ]),
    };
    const userRepository = {
      count: jest.fn().mockResolvedValue(100),
    };
    const useCase = new GetDashboardGraphQLUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({
      pageSize: 2,
      after: { totalScore: 120, id: 'some-id' },
      fields: ['name', 'avatarUrl'],
      includeTotalCount: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(dashboardRepository.getDashboardSummaryAfter).toHaveBeenCalledWith(
        { totalScore: 120, id: 'some-id' },
        3,
        ['name', 'avatarUrl'],
      );
      expect(result.data.edges).toHaveLength(2);
      expect(result.data.edges[0]?.position).toEqual({
        totalScore: 100,
        id: '01990001-0000-7000-8000-000000000001',
      });
      expect(result.data.hasNextPage).toBe(true);
      expect(result.data.totalCount).toBe(100);
    }
  });

  it('omits totalCount query when includeTotalCount is false', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
      getDashboardSummaryAfter: jest.fn().mockResolvedValue(sampleRows),
    };
    const userRepository = {
      count: jest.fn(),
    };
    const useCase = new GetDashboardGraphQLUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({
      pageSize: 10,
      fields: ['name'],
      includeTotalCount: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(userRepository.count).not.toHaveBeenCalled();
      expect(result.data.totalCount).toBeNull();
      expect(result.data.hasNextPage).toBe(false);
    }
  });

  it('performs offset pagination when page is explicitly requested', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn().mockResolvedValue(sampleRows),
      getDashboardSummaryAfter: jest.fn(),
    };
    const userRepository = {
      count: jest.fn().mockResolvedValue(2),
    };
    const useCase = new GetDashboardGraphQLUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({
      page: 1,
      pageSize: 20,
      fields: ['name', 'completedCourses'],
      includeTotalCount: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(dashboardRepository.getDashboardSummary).toHaveBeenCalledWith(1, 20, [
        'name',
        'completedCourses',
      ]);
      expect(result.data.edges).toHaveLength(2);
      expect(result.data.hasNextPage).toBe(false);
    }
  });

  it('rejects input with both page and after cursor', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
      getDashboardSummaryAfter: jest.fn(),
    };
    const userRepository = { count: jest.fn() };
    const useCase = new GetDashboardGraphQLUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({
      page: 2,
      after: { totalScore: 100, id: 'abc' },
      fields: ['name'],
      includeTotalCount: false,
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error instanceof InvalidPaginationError) {
      expect(result.error.field).toBe('page');
      expect(result.error.message).toContain('Use either "page" or "after"');
    }
  });

  it('rejects invalid page size', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
      getDashboardSummaryAfter: jest.fn(),
    };
    const userRepository = { count: jest.fn() };
    const useCase = new GetDashboardGraphQLUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({
      pageSize: -5,
      fields: ['name'],
      includeTotalCount: false,
    });

    expect(result.success).toBe(false);
    if (!result.success && result.error instanceof InvalidPaginationError) {
      expect(result.error.field).toBe('pageSize');
    }
  });

  it('returns failure when repository throws', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
      getDashboardSummaryAfter: jest.fn().mockRejectedValue(new Error('Syntax error')),
    };
    const userRepository = { count: jest.fn() };
    const useCase = new GetDashboardGraphQLUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({
      fields: ['name'],
      includeTotalCount: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Loading the GraphQL dashboard');
    }
  });
});
