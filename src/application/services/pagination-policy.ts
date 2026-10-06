import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export type PaginationPolicy = {
  readonly defaultPageSize: number;
  /** Hard cap: no client can ask for more entries per page than this. */
  readonly maxPageSize: number;
};

export const DEFAULT_PAGINATION_POLICY: PaginationPolicy = {
  defaultPageSize: 20,
  maxPageSize: 100,
};

/** Highest page number accepted: deep OFFSETs make MySQL read and discard every skipped row. */
export const MAX_PAGE = 10_000;

export const resolvePageSize = (
  size: number | null | undefined,
  policy: PaginationPolicy,
  field = 'size',
): Result<number, InvalidPaginationError> => {
  const value = size ?? policy.defaultPageSize;
  if (!Number.isInteger(value) || value < 1 || value > policy.maxPageSize) {
    return fail(
      new InvalidPaginationError(
        field,
        `${field} must be an integer between 1 and ${policy.maxPageSize}`,
      ),
    );
  }
  return ok(value);
};

export const resolvePage = (
  page: number | null | undefined,
  field = 'page',
): Result<number, InvalidPaginationError> => {
  const value = page ?? 1;
  if (!Number.isInteger(value) || value < 1 || value > MAX_PAGE) {
    return fail(
      new InvalidPaginationError(field, `${field} must be an integer between 1 and ${MAX_PAGE}`),
    );
  }
  return ok(value);
};
