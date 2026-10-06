import { InvalidAttributeError } from '@domain/errors/invalid-attribute.error';
import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import { ViolationCollector, requireDate, requireId, requireText } from '@domain/shared/guards';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';
import { AvatarUrl } from '@domain/value-objects/avatar-url.value-object';
import { Email } from '@domain/value-objects/email.value-object';
import { UserName } from '@domain/value-objects/user-name.value-object';
import type { Certificate } from './certificate.entity';
import type { Enrollment } from './enrollment.entity';

export type UserProps = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly bio: string;
  readonly enrollments: readonly Enrollment[];
  readonly certificates: readonly Certificate[];
  readonly createdAt: Date;
};

/** A student: aggregate root of its enrollments and certificates. */
export class User {
  static readonly BIO_MAX_LENGTH = 2000;

  private constructor(
    readonly id: string,
    readonly name: UserName,
    readonly email: Email,
    readonly avatarUrl: AvatarUrl,
    readonly bio: string,
    readonly enrollments: readonly Enrollment[],
    readonly certificates: readonly Certificate[],
    readonly createdAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Invariants: every enrollment and certificate belongs to this user, and a user is enrolled
   * at most once in the same course.
   */
  static create(props: UserProps): Result<User, InvalidEntityError> {
    const violations = new ViolationCollector('User');
    const id = violations.take(requireId('id', props.id));
    const name = violations.take(UserName.create(props.name));
    const email = violations.take(Email.create(props.email));
    const avatarUrl = violations.take(AvatarUrl.create(props.avatarUrl));
    const bio = violations.take(requireText('bio', props.bio, { max: User.BIO_MAX_LENGTH }));
    const createdAt = violations.take(requireDate('createdAt', props.createdAt));

    if (id !== null) {
      User.checkOwnership(id, props, violations);
    }
    const courseIds = props.enrollments.map((enrollment) => enrollment.course.id);
    const duplicatedCourse = courseIds.find(
      (courseId, index) => courseIds.indexOf(courseId) !== index,
    );
    if (duplicatedCourse !== undefined) {
      violations.add(
        new InvalidAttributeError(
          'enrollments',
          duplicatedCourse,
          'A user cannot be enrolled twice in the same course',
        ),
      );
    }

    if (
      id === null ||
      name === null ||
      email === null ||
      avatarUrl === null ||
      bio === null ||
      createdAt === null ||
      violations.hasViolations
    ) {
      return fail(violations.toError());
    }
    return ok(
      new User(
        id,
        name,
        email,
        avatarUrl,
        bio,
        Object.freeze([...props.enrollments]),
        Object.freeze([...props.certificates]),
        createdAt,
      ),
    );
  }

  /** Dashboard ranking criterion: the sum of the scores of every course the user is enrolled in. */
  get totalScore(): number {
    return this.enrollments.reduce((total, enrollment) => total + enrollment.score.value, 0);
  }

  get completedCourses(): number {
    return this.enrollments.filter((enrollment) => enrollment.isCompleted).length;
  }

  equals(other: User): boolean {
    return this.id === other.id;
  }

  private static checkOwnership(
    id: string,
    props: UserProps,
    violations: ViolationCollector,
  ): void {
    const foreignEnrollment = props.enrollments.find((enrollment) => enrollment.userId !== id);
    if (foreignEnrollment !== undefined) {
      violations.add(
        new InvalidAttributeError(
          'enrollments',
          foreignEnrollment.id,
          'Every enrollment must belong to the user',
        ),
      );
    }
    const foreignCertificate = props.certificates.find((certificate) => certificate.userId !== id);
    if (foreignCertificate !== undefined) {
      violations.add(
        new InvalidAttributeError(
          'certificates',
          foreignCertificate.id,
          'Every certificate must belong to the user',
        ),
      );
    }
  }
}
