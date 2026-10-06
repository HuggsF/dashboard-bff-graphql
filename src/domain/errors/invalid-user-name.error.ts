import { FieldValidationError } from './domain.error';

export class InvalidUserNameError extends FieldValidationError {
  readonly code = 'INVALID_USER_NAME';

  constructor(value: string, reason: string, field = 'name') {
    super(field, value, reason);
  }
}
