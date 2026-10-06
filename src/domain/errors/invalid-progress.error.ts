import { FieldValidationError } from './domain.error';

export class InvalidProgressError extends FieldValidationError {
  readonly code = 'INVALID_PROGRESS';

  constructor(value: string, reason: string, field = 'progress') {
    super(field, value, reason);
  }
}
