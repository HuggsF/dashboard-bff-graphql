import type { FieldValidationError } from '@domain/errors/domain.error';
import { InvalidAttributeError } from '@domain/errors/invalid-attribute.error';
import { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { fail, ok } from './result';
import type { Result } from './result';

export const ID_MAX_LENGTH = 36;

/** Identifiers are opaque strings (UUIDs in practice) of at most 36 characters. */
export const requireId = (field: string, raw: string): Result<string, InvalidAttributeError> => {
  const id = raw.trim();
  if (id.length === 0) {
    return fail(new InvalidAttributeError(field, raw, `${field} is required`));
  }
  if (id.length > ID_MAX_LENGTH) {
    return fail(
      new InvalidAttributeError(field, raw, `${field} must be at most ${ID_MAX_LENGTH} characters`),
    );
  }
  return ok(id);
};

export const requireDate = (field: string, raw: Date): Result<Date, InvalidAttributeError> =>
  Number.isNaN(raw.getTime())
    ? fail(new InvalidAttributeError(field, 'Invalid Date', `${field} must be a valid date`))
    : ok(raw);

export type TextRule = { readonly min?: number; readonly max: number };

/** Free text, trimmed. `min` defaults to 0 (empty text allowed). */
export const requireText = (
  field: string,
  raw: string,
  rule: TextRule,
): Result<string, InvalidAttributeError> => {
  const text = raw.trim();
  const min = rule.min ?? 0;
  if (text.length < min) {
    return fail(
      new InvalidAttributeError(
        field,
        raw,
        min === 1 ? `${field} is required` : `${field} must be at least ${min} characters`,
      ),
    );
  }
  if (text.length > rule.max) {
    return fail(
      new InvalidAttributeError(
        field,
        raw.slice(0, 50),
        `${field} must be at most ${rule.max} characters`,
      ),
    );
  }
  return ok(text);
};

export type IntegerRule = { readonly min: number; readonly max: number };

export const requireInteger = (
  field: string,
  raw: number,
  rule: IntegerRule,
): Result<number, InvalidAttributeError> =>
  Number.isInteger(raw) && raw >= rule.min && raw <= rule.max
    ? ok(raw)
    : fail(
        new InvalidAttributeError(
          field,
          String(raw),
          `${field} must be an integer between ${rule.min} and ${rule.max}`,
        ),
      );

/**
 * Collects every violation of an entity factory instead of stopping at the first one, so the
 * caller learns about all problems at once (`InvalidEntityError.violations`).
 */
export class ViolationCollector {
  private readonly violations: FieldValidationError[] = [];

  constructor(private readonly entity: string) {}

  /** Returns the value of a successful result, or `null` after recording the violation. */
  take<T>(result: Result<T, FieldValidationError>): T | null {
    if (result.success) {
      return result.data;
    }
    this.violations.push(result.error);
    return null;
  }

  add(error: FieldValidationError): void {
    this.violations.push(error);
  }

  get hasViolations(): boolean {
    return this.violations.length > 0;
  }

  toError(): InvalidEntityError {
    return new InvalidEntityError(this.entity, [...this.violations]);
  }
}
