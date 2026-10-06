import {
  DEFAULT_PAGINATION_POLICY,
  MAX_PAGE,
  resolvePage,
  resolvePageSize,
} from '@application/services/pagination-policy';

describe('Pagination Policy', () => {
  describe('resolvePage', () => {
    it('defaults to page 1 when null or undefined', () => {
      expect(resolvePage(undefined)).toEqual({ success: true, data: 1 });
      expect(resolvePage(null)).toEqual({ success: true, data: 1 });
    });

    it('accepts valid page numbers', () => {
      expect(resolvePage(5)).toEqual({ success: true, data: 5 });
      expect(resolvePage(MAX_PAGE)).toEqual({ success: true, data: MAX_PAGE });
    });

    it('rejects non-integer, negative, or zero page numbers', () => {
      const zero = resolvePage(0);
      expect(zero.success).toBe(false);

      const negative = resolvePage(-1);
      expect(negative.success).toBe(false);

      const float = resolvePage(2.5);
      expect(float.success).toBe(false);
    });

    it('rejects page exceeding MAX_PAGE', () => {
      const tooHigh = resolvePage(MAX_PAGE + 1);
      expect(tooHigh.success).toBe(false);
      if (!tooHigh.success) {
        expect(tooHigh.error.field).toBe('page');
      }
    });

    it('supports custom field name in error', () => {
      const result = resolvePage(-1, 'customPage');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe('customPage');
      }
    });
  });

  describe('resolvePageSize', () => {
    const policy = { defaultPageSize: 25, maxPageSize: 50 };

    it('defaults to policy default when null or undefined', () => {
      expect(resolvePageSize(undefined, policy)).toEqual({ success: true, data: 25 });
      expect(resolvePageSize(null, policy)).toEqual({ success: true, data: 25 });
    });

    it('accepts valid size within bounds', () => {
      expect(resolvePageSize(10, policy)).toEqual({ success: true, data: 10 });
      expect(resolvePageSize(50, policy)).toEqual({ success: true, data: 50 });
    });

    it('rejects sizes below 1 or non-integers', () => {
      expect(resolvePageSize(0, policy).success).toBe(false);
      expect(resolvePageSize(-5, policy).success).toBe(false);
      expect(resolvePageSize(10.5, policy).success).toBe(false);
    });

    it('rejects sizes exceeding maxPageSize', () => {
      const tooLarge = resolvePageSize(51, policy);
      expect(tooLarge.success).toBe(false);
      if (!tooLarge.success) {
        expect(tooLarge.error.field).toBe('size');
      }
    });

    it('supports custom field name', () => {
      const result = resolvePageSize(0, DEFAULT_PAGINATION_POLICY, 'pageSize');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toBe('pageSize');
      }
    });
  });
});
