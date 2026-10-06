import { InvalidAttributeError } from '@domain/errors/invalid-attribute.error';
import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { ViolationCollector, requireDate, requireId } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import { Progress } from '@domain/value-objects/progress.value-object';
import { Score } from '@domain/value-objects/score.value-object';
import type { Course } from './course.entity';

export type EnrollmentProps = {
  readonly id: string;
  readonly userId: string;
  readonly course: Course;
  readonly score: number;
  readonly progress: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
};

/** A student taking a course. Completed enrollments are the ones that count as finished courses. */
export class Enrollment {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly course: Course,
    readonly score: Score,
    readonly progress: Progress,
    readonly startedAt: Date,
    readonly completedAt: Date | null,
  ) {
    Object.freeze(this);
  }

  /**
   * Invariants: a completed enrollment has 100% progress and cannot finish before it started;
   * an enrollment at 100% without a completion date is still in progress (awaiting completion).
   */
  static create(props: EnrollmentProps): Result<Enrollment, InvalidEntityError> {
    const violations = new ViolationCollector('Enrollment');
    const id = violations.take(requireId('id', props.id));
    const userId = violations.take(requireId('userId', props.userId));
    const score = violations.take(Score.create(props.score));
    const progress = violations.take(Progress.create(props.progress));
    const startedAt = violations.take(requireDate('startedAt', props.startedAt));
    const completedAt =
      props.completedAt === null
        ? null
        : violations.take(requireDate('completedAt', props.completedAt));

    if (completedAt !== null && startedAt !== null && completedAt < startedAt) {
      violations.add(
        new InvalidAttributeError(
          'completedAt',
          completedAt.toISOString(),
          'An enrollment cannot be completed before it started',
        ),
      );
    }
    if (completedAt !== null && progress !== null && !progress.isComplete) {
      violations.add(
        new InvalidAttributeError(
          'progress',
          String(progress.value),
          'A completed enrollment must have 100% progress',
        ),
      );
    }

    if (
      id === null ||
      userId === null ||
      score === null ||
      progress === null ||
      startedAt === null ||
      violations.hasViolations
    ) {
      return fail(violations.toError());
    }
    return ok(new Enrollment(id, userId, props.course, score, progress, startedAt, completedAt));
  }

  get isCompleted(): boolean {
    return this.completedAt !== null;
  }

  equals(other: Enrollment): boolean {
    return this.id === other.id;
  }
}
