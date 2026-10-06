import {
  bffDashboardQuerySchema,
  compareQuerySchema,
} from '@presentation/http/schemas/dashboard.schemas';
import { validate } from '@presentation/http/schemas/validate';
import { HttpError } from '@presentation/http/errors/http-error';
import { toHttpError } from '@presentation/http/errors/error-mapper';
import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { InvalidCompareOptionsError } from '@application/errors/invalid-compare-options.error';
import { UnexpectedError } from '@application/errors/unexpected.error';

describe('HTTP Schemas & Validation', () => {
  describe('bffDashboardQuerySchema', () => {
    it('coerces string numbers to integers', () => {
      const result = validate(bffDashboardQuerySchema, { page: '2', size: '20' });
      expect(result).toEqual({ page: 2, size: 20 });
    });

    it('allows undefined parameters', () => {
      const result = validate(bffDashboardQuerySchema, {});
      expect(result).toEqual({});
    });

    it('throws HttpError 400 for non-numeric strings', () => {
      expect(() => validate(bffDashboardQuerySchema, { page: 'abc' })).toThrow(HttpError);
    });
  });

  describe('compareQuerySchema', () => {
    it('defaults runs to 3 when omitted', () => {
      const result = validate(compareQuerySchema, {});
      expect(result).toEqual({ runs: 3 });
    });

    it('coerces runs parameter to number', () => {
      const result = validate(compareQuerySchema, { runs: '5' });
      expect(result).toEqual({ runs: 5 });
    });
  });

  describe('toHttpError mapper', () => {
    it('maps InvalidPaginationError to 400', () => {
      const err = toHttpError(new InvalidPaginationError('size', 'bad size'));
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_PAGINATION');
    });

    it('maps InvalidCompareOptionsError to 400', () => {
      const err = toHttpError(new InvalidCompareOptionsError('bad options'));
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_COMPARE_OPTIONS');
    });

    it('maps UnexpectedError to 500 without leaking details', () => {
      const err = toHttpError(new UnexpectedError('secret DB fail', new Error('leak')));
      expect(err.status).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.message).toBe('Internal server error');
    });
  });
});
