import { ApplicationError } from './application.error';

export class InvalidCompareOptionsError extends ApplicationError {
  readonly code = 'INVALID_COMPARE_OPTIONS';
}
