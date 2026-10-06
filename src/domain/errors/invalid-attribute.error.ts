import { FieldValidationError } from './domain.error';

/** An entity attribute that is not modelled as a Value Object (ids, dates, free text...) is invalid. */
export class InvalidAttributeError extends FieldValidationError {
  readonly code = 'INVALID_ATTRIBUTE';
}
