import type {
  GetUserProfileInput,
  UserProfileDTO,
  UserProfileField,
} from '@application/dtos/graph.dto';
import { UnexpectedError } from '@application/errors/unexpected.error';
import { selectFields } from '@application/services/field-selection';
import type { UserRepository } from '@domain/repositories/user.repository';
import { ID_MAX_LENGTH } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export const USER_PROFILE_FIELDS = [
  'name',
  'email',
  'avatarUrl',
] as const satisfies readonly UserProfileField[];

/**
 * GraphQL `user(id)`: reads only the scalar columns selected by the client. Relations
 * (enrollments, certificates…) are resolved lazily by the DataLoaders, only if selected.
 */
export class GetUserProfileUseCase {
  constructor(private readonly userRepository: Pick<UserRepository, 'findAllProjected'>) {}

  async execute(
    input: GetUserProfileInput,
  ): Promise<Result<UserProfileDTO | null, UnexpectedError>> {
    const id = input.id.trim();
    if (id.length === 0 || id.length > ID_MAX_LENGTH) {
      return ok(null);
    }
    try {
      const [user] = await this.userRepository.findAllProjected(
        selectFields(input.fields, USER_PROFILE_FIELDS),
        { ids: [id] },
      );
      return ok(user ?? null);
    } catch (error: unknown) {
      return fail(new UnexpectedError('Loading the user profile', error));
    }
  }
}
