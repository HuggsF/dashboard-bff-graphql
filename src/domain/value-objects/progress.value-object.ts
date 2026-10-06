import { InvalidProgressError } from '@domain/errors/invalid-progress.error';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import { PERCENTAGE_MAX, PERCENTAGE_MIN, parsePercentage } from './percentage';

/** Share of a course already completed, in percent (integer from 0 to 100). */
export class Progress {
  static readonly MIN = PERCENTAGE_MIN;
  static readonly MAX = PERCENTAGE_MAX;

  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(raw: number): Result<Progress, InvalidProgressError> {
    const parsed = parsePercentage(raw, 'Progress');
    return parsed.success
      ? ok(new Progress(parsed.data))
      : fail(new InvalidProgressError(String(raw), parsed.error));
  }

  get isComplete(): boolean {
    return this.value === Progress.MAX;
  }

  equals(other: Progress): boolean {
    return this.value === other.value;
  }
}
