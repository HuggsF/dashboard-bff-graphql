import { User } from '@domain/entities/user.entity';
import { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import {
  USER_ID,
  buildCertificate,
  buildCourse,
  buildEnrollment,
  buildUser,
  userProps,
  uuid,
} from '../../../support/builders';

describe('User', () => {
  it('creates a user with normalised value objects', () => {
    const result = User.create(
      userProps({ name: '  Ada   Lovelace ', email: ' ADA@School.edu ', avatarUrl: '  ' }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(USER_ID);
      expect(result.data.name.value).toBe('Ada Lovelace');
      expect(result.data.email.value).toBe('ada@school.edu');
      expect(result.data.avatarUrl.value).toBeNull();
      expect(result.data.createdAt.toISOString()).toBe('2024-05-01T08:00:00.000Z');
      expect(Object.isFrozen(result.data)).toBe(true);
      expect(Object.isFrozen(result.data.enrollments)).toBe(true);
    }
  });

  it('computes the dashboard figures from its enrollments', () => {
    const user = buildUser({
      enrollments: [
        buildEnrollment({ id: uuid(4, 1), score: 90, course: buildCourse({ id: uuid(3, 1) }) }),
        buildEnrollment({
          id: uuid(4, 2),
          score: 35,
          progress: 40,
          completedAt: null,
          course: buildCourse({ id: uuid(3, 2) }),
        }),
        buildEnrollment({ id: uuid(4, 3), score: 70, course: buildCourse({ id: uuid(3, 3) }) }),
      ],
      certificates: [buildCertificate()],
    });

    expect(user.totalScore).toBe(195);
    expect(user.completedCourses).toBe(2);
    expect(user.certificates).toHaveLength(1);
  });

  it('has a total score of 0 without enrollments', () => {
    const user = buildUser();

    expect(user.totalScore).toBe(0);
    expect(user.completedCourses).toBe(0);
  });

  it('reports every invalid field at once', () => {
    const result = User.create(
      userProps({
        id: '',
        name: 'X',
        email: 'not-an-email',
        avatarUrl: 'javascript:alert(1)',
        bio: 'b'.repeat(User.BIO_MAX_LENGTH + 1),
        createdAt: new Date('nope'),
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(InvalidEntityError);
      expect(result.error.entity).toBe('User');
      expect(result.error.violations.map((violation) => violation.field)).toEqual([
        'id',
        'name',
        'email',
        'avatarUrl',
        'bio',
        'createdAt',
      ]);
      expect(result.error.message).toContain('Invalid User: id (id is required)');
    }
  });

  it('rejects enrollments and certificates that belong to another user', () => {
    const result = User.create(
      userProps({
        enrollments: [buildEnrollment({ userId: uuid(9, 2) })],
        certificates: [buildCertificate({ userId: uuid(9, 3) })],
      }),
    );

    expect(
      !result.success && result.error.violations.map((violation) => violation.message),
    ).toEqual([
      'Every enrollment must belong to the user',
      'Every certificate must belong to the user',
    ]);
  });

  it('rejects two enrollments in the same course', () => {
    const course = buildCourse();
    const result = User.create(
      userProps({
        enrollments: [
          buildEnrollment({ id: uuid(4, 1), course }),
          buildEnrollment({ id: uuid(4, 2), course }),
        ],
      }),
    );

    expect(!result.success && result.error.violations[0]?.message).toBe(
      'A user cannot be enrolled twice in the same course',
    );
  });

  it('compares by identity', () => {
    expect(buildUser().equals(buildUser({ name: 'Someone Else' }))).toBe(true);
    expect(buildUser().equals(buildUser({ id: uuid(9, 2) }))).toBe(false);
  });
});
