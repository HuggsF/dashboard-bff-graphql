import { GetUserProfileUseCase } from '@application/use-cases/get-user-profile.use-case';

describe('GetUserProfileUseCase', () => {
  const sampleProfile = {
    id: '01990001-0000-7000-8000-000000000001',
    name: 'Ada Lovelace',
    email: 'ada@school.edu',
    avatarUrl: 'https://example.com/ada.png',
  };

  it('fetches user profile with projected scalar fields', async () => {
    const userRepository = {
      findAllProjected: jest.fn().mockResolvedValue([sampleProfile]),
    };
    const useCase = new GetUserProfileUseCase(userRepository);

    const result = await useCase.execute({
      id: '01990001-0000-7000-8000-000000000001',
      fields: ['name', 'avatarUrl'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(userRepository.findAllProjected).toHaveBeenCalledWith(['name', 'avatarUrl'], {
        ids: ['01990001-0000-7000-8000-000000000001'],
      });
      expect(result.data).toEqual(sampleProfile);
    }
  });

  it('returns ok(null) when user is not found in repository', async () => {
    const userRepository = {
      findAllProjected: jest.fn().mockResolvedValue([]),
    };
    const useCase = new GetUserProfileUseCase(userRepository);

    const result = await useCase.execute({
      id: '01990001-0000-7000-8000-000000000099',
      fields: ['name'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('returns ok(null) for blank or oversized id without querying database', async () => {
    const userRepository = {
      findAllProjected: jest.fn(),
    };
    const useCase = new GetUserProfileUseCase(userRepository);

    const blankResult = await useCase.execute({ id: '   ', fields: ['name'] });
    expect(blankResult.success).toBe(true);
    if (blankResult.success) {
      expect(blankResult.data).toBeNull();
    }

    const longResult = await useCase.execute({ id: 'a'.repeat(37), fields: ['name'] });
    expect(longResult.success).toBe(true);
    if (longResult.success) {
      expect(longResult.data).toBeNull();
    }

    expect(userRepository.findAllProjected).not.toHaveBeenCalled();
  });

  it('captures unexpected errors', async () => {
    const userRepository = {
      findAllProjected: jest.fn().mockRejectedValue(new Error('Pool closed')),
    };
    const useCase = new GetUserProfileUseCase(userRepository);

    const result = await useCase.execute({
      id: '01990001-0000-7000-8000-000000000001',
      fields: ['name'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Loading the user profile');
    }
  });
});
