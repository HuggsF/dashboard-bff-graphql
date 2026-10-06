import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export const PERCENTAGE_MIN = 0;
export const PERCENTAGE_MAX = 100;

/** Rule shared by Score and Progress: an integer between 0 and 100 (inclusive). */
export const parsePercentage = (raw: number, label: string): Result<number, string> => {
  if (!Number.isFinite(raw)) {
    return fail(`${label} must be a number`);
  }
  if (!Number.isInteger(raw)) {
    return fail(`${label} must be an integer`);
  }
  if (raw < PERCENTAGE_MIN || raw > PERCENTAGE_MAX) {
    return fail(`${label} must be between ${PERCENTAGE_MIN} and ${PERCENTAGE_MAX}`);
  }
  return ok(raw);
};
