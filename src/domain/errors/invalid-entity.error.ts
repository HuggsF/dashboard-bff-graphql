import { DomainError } from './domain.error';
import type { FieldValidationError } from './domain.error';

/** Aggregates every violation found while creating an entity, so all problems surface at once. */
export class InvalidEntityError extends DomainError {
  readonly code = 'INVALID_ENTITY';

  constructor(
    readonly entity: string,
    readonly violations: readonly FieldValidationError[],
  ) {
    super(
      `Invalid ${entity}: ${violations.map((violation) => `${violation.field} (${violation.message})`).join('; ')}`,
    );
  }
}
