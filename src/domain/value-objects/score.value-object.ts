import { InvalidScoreError } from '@domain/errors/invalid-score.error';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import { PERCENTAGE_MAX, PERCENTAGE_MIN, parsePercentage } from './percentage';

/** Grade obtained in a course: an integer from 0 to 100. */
export class Score {
  static readonly MIN = PERCENTAGE_MIN;
  static readonly MAX = PERCENTAGE_MAX;

  private constructor(readonly value: number) {
    Object.freeze(this);
  }

  static create(raw: number): Result<Score, InvalidScoreError> {
    const parsed = parsePercentage(raw, 'Score');
    return parsed.success
      ? ok(new Score(parsed.data))
      : fail(new InvalidScoreError(String(raw), parsed.error));
  }

  equals(other: Score): boolean {
    return this.value === other.value;
  }
}
