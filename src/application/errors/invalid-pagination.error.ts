import { ApplicationError } from './application.error';

/** Pagination arguments outside the allowed range (page < 1, size > max, page + cursor...). */
export class InvalidPaginationError extends ApplicationError {
  readonly code = 'INVALID_PAGINATION';

  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}
