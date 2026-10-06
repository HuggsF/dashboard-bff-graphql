import { InvalidUserNameError } from '@domain/errors/invalid-user-name.error';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

/** Letters from any alphabet (incl. accents), spaces, hyphens, periods (`Dr.`) and apostrophes. */
const ALLOWED_CHARACTERS = /^[\p{L}\p{M} .'’-]+$/u;
const HAS_LETTER = /\p{L}/u;

/** Display name of a person (students and instructors). */
export class UserName {
  static readonly MIN_LENGTH = 2;
  static readonly MAX_LENGTH = 100;

  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  /** Trims the name and collapses inner whitespace before validating it. */
  static create(raw: string): Result<UserName, InvalidUserNameError> {
    const normalized = raw.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      return fail(new InvalidUserNameError(raw, 'Name is required'));
    }
    if (normalized.length < UserName.MIN_LENGTH) {
      return fail(
        new InvalidUserNameError(raw, `Name must be at least ${UserName.MIN_LENGTH} characters`),
      );
    }
    if (normalized.length > UserName.MAX_LENGTH) {
      return fail(
        new InvalidUserNameError(raw, `Name must be at most ${UserName.MAX_LENGTH} characters`),
      );
    }
    if (!ALLOWED_CHARACTERS.test(normalized) || !HAS_LETTER.test(normalized)) {
      return fail(
        new InvalidUserNameError(
          raw,
          'Name may only contain letters, spaces, periods, hyphens and apostrophes',
        ),
      );
    }

    return ok(new UserName(normalized));
  }

  equals(other: UserName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
