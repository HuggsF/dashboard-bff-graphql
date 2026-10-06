import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import {
  BFF_DASHBOARD_FIELDS,
  GetDashboardBFFUseCase,
} from '@application/use-cases/get-dashboard-bff.use-case';

describe('GetDashboardBFFUseCase', () => {
  const sampleRows = [
    {
      id: '01990001-0000-7000-8000-000000000001',
      name: 'Ada Lovelace',
      totalScore: 95,
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
    {
      id: '01990001-0000-7000-8000-000000000002',
      name: 'Alan Turing',
      totalScore: 90,
      avatarUrl: null,
    },
  ];

  it('fetches dashboard items with SQL projection and pagination', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn().mockResolvedValue(sampleRows),
    };
    const userRepository = {
      count: jest.fn().mockResolvedValue(45),
    };
    const useCase = new GetDashboardBFFUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({ page: 1, size: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(dashboardRepository.getDashboardSummary).toHaveBeenCalledWith(
        1,
        20,
        BFF_DASHBOARD_FIELDS,
      );
      expect(result.data.data).toHaveLength(2);
      expect(result.data.data[0]).toEqual({
        id: '01990001-0000-7000-8000-000000000001',
        name: 'Ada Lovelace',
        totalScore: 95,
        avatarUrl: 'https://example.com/avatar1.jpg',
      });
      expect(result.data.pagination).toEqual({
        page: 1,
        size: 20,
        totalItems: 45,
        totalPages: 3,
        hasNext: true,
      });
    }
  });

  it('computes hasNext as false on the last page', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn().mockResolvedValue(sampleRows),
    };
    const userRepository = {
      count: jest.fn().mockResolvedValue(45),
    };
    const useCase = new GetDashboardBFFUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({ page: 3, size: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pagination.hasNext).toBe(false);
    }
  });

  it('fails with InvalidPaginationError when page is invalid', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
    };
    const userRepository = {
      count: jest.fn(),
    };
    const useCase = new GetDashboardBFFUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({ page: 0, size: 20 });

    expect(result.success).toBe(false);
    if (!result.success && result.error instanceof InvalidPaginationError) {
      expect(result.error.field).toBe('page');
    }
  });

  it('fails with InvalidPaginationError when size exceeds max limit', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn(),
    };
    const userRepository = {
      count: jest.fn(),
    };
    const useCase = new GetDashboardBFFUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({ page: 1, size: 500 });

    expect(result.success).toBe(false);
    if (!result.success && result.error instanceof InvalidPaginationError) {
      expect(result.error.field).toBe('size');
    }
  });

  it('returns failure when database repository throws', async () => {
    const dashboardRepository = {
      getDashboardSummary: jest.fn().mockRejectedValue(new Error('Connection lost')),
    };
    const userRepository = {
      count: jest.fn().mockResolvedValue(10),
    };
    const useCase = new GetDashboardBFFUseCase(dashboardRepository, userRepository);

    const result = await useCase.execute({ page: 1, size: 20 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Loading the BFF dashboard');
    }
  });
});
