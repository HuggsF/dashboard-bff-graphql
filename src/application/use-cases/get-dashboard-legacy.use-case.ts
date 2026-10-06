import type { LegacyDashboardOutput } from '@application/dtos/legacy-dashboard.dto';
import { UnexpectedError } from '@application/errors/unexpected.error';
import { toLegacyDashboard } from '@application/services/legacy-dashboard.mapper';
import type { UserRepository } from '@domain/repositories/user.repository';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

/**
 * v1 — THE PROBLEM. Loads every user with every relation and returns all of it, with no
 * pagination, although the dashboard only renders a name, a score and an avatar per student.
 */
export class GetDashboardLegacyUseCase {
  constructor(private readonly userRepository: Pick<UserRepository, 'findAll'>) {}

  async execute(): Promise<Result<LegacyDashboardOutput, UnexpectedError>> {
    try {
      const users = await this.userRepository.findAll();
      return ok(toLegacyDashboard(users));
    } catch (error: unknown) {
      return fail(new UnexpectedError('Loading the legacy dashboard', error));
    }
  }
}
