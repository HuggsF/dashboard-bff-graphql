import type { ApplicationError } from '@application/errors/application.error';
import { HttpError } from './http-error';

const STATUS_BY_CODE: ReadonlyMap<string, number> = new Map([
  ['INVALID_PAGINATION', 400],
  ['INVALID_COMPARE_OPTIONS', 400],
]);

/** Translates use-case failures (Result errors) into HTTP semantics; internals are never leaked. */
export const toHttpError = (error: ApplicationError): HttpError => {
  const status = STATUS_BY_CODE.get(error.code);
  return status === undefined
    ? new HttpError(500, 'INTERNAL_ERROR', 'Internal server error')
    : new HttpError(status, error.code, error.message);
};
