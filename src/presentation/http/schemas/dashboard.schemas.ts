import { z } from 'zod';

/** Types only: ranges (page >= 1, size <= max…) are business rules checked by the use cases. */
const integer = z.coerce.number().int();

export const bffDashboardQuerySchema = z.object({
  page: integer.optional(),
  size: integer.optional(),
});

export const compareQuerySchema = z.object({
  runs: integer.default(3),
});
