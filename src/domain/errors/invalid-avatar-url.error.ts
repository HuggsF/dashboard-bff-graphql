import { FieldValidationError } from './domain.error';

export class InvalidAvatarUrlError extends FieldValidationError {
  readonly code = 'INVALID_AVATAR_URL';

  constructor(value: string, reason: string, field = 'avatarUrl') {
    super(field, value, reason);
  }
}
