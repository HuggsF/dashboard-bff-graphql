import { InvalidCourseNameError } from '@domain/errors/invalid-course-name.error';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export class CourseName {
  static readonly MIN_LENGTH = 2;
  static readonly MAX_LENGTH = 200;

  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  /** Trims the name and collapses inner whitespace before validating it. */
  static create(raw: string): Result<CourseName, InvalidCourseNameError> {
    const normalized = raw.trim().replace(/\s+/g, ' ');

    if (normalized.length === 0) {
      return fail(new InvalidCourseNameError(raw, 'Course name is required'));
    }
    if (normalized.length < CourseName.MIN_LENGTH) {
      return fail(
        new InvalidCourseNameError(
          raw,
          `Course name must be at least ${CourseName.MIN_LENGTH} characters`,
        ),
      );
    }
    if (normalized.length > CourseName.MAX_LENGTH) {
      return fail(
        new InvalidCourseNameError(
          raw,
          `Course name must be at most ${CourseName.MAX_LENGTH} characters`,
        ),
      );
    }
    return ok(new CourseName(normalized));
  }

  equals(other: CourseName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
