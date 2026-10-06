import { GetDashboardLegacyUseCase } from '@application/use-cases/get-dashboard-legacy.use-case';
import { buildUser } from '../../../support/builders';

describe('GetDashboardLegacyUseCase', () => {
  it('loads all users and maps to legacy dashboard format', async () => {
    const user = buildUser();
    const userRepository = {
      findAll: jest.fn().mockResolvedValue([user]),
    };
    const useCase = new GetDashboardLegacyUseCase(userRepository);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0]?.id).toBe(user.id);
      expect(result.data.users[0]?.name).toBe(user.name.value);
      expect(result.data.total).toBe(1);
    }
  });

  it('returns failure when repository throws an error', async () => {
    const userRepository = {
      findAll: jest.fn().mockRejectedValue(new Error('DB Connection Timeout')),
    };
    const useCase = new GetDashboardLegacyUseCase(userRepository);

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Loading the legacy dashboard');
      expect(result.error.message).toContain('DB Connection Timeout');
    }
  });
});
