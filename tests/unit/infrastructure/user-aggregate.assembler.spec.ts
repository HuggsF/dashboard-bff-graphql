import { CorruptedRecordError } from '@infrastructure/database/corrupted-record.error';
import { assembleUsers } from '@infrastructure/database/user-aggregate.assembler';
import type { UserGraphRows } from '@infrastructure/database/user-aggregate.assembler';
import { uuid } from '../../support/builders';

describe('assembleUsers', () => {
  const instructorId = uuid(1, 1);
  const moduleId = uuid(2, 1);
  const courseId = uuid(3, 1);
  const userId = uuid(9, 1);
  const enrollmentId = uuid(4, 1);
  const certificateId = uuid(5, 1);

  const validGraph: UserGraphRows = {
    users: [
      {
        id: userId,
        name: 'Ada Lovelace',
        email: 'ada@school.edu',
        avatar_url: 'https://example.com/ada.png',
        bio: 'First programmer.',
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      },
    ],
    instructors: [
      {
        id: instructorId,
        name: 'Grace Hopper',
        bio: 'Rear admiral.',
        avatar_url: null,
      },
    ],
    modules: [
      {
        id: moduleId,
        course_id: courseId,
        title: 'Introduction',
        content: 'Content here',
        order_index: 0,
      },
    ],
    courses: [
      {
        id: courseId,
        name: 'CompSci 101',
        description: 'Basics of computing',
        category: 'Computer Science',
        duration_hours: 20,
        instructor_id: instructorId,
      },
    ],
    enrollments: [
      {
        id: enrollmentId,
        user_id: userId,
        course_id: courseId,
        score: 90,
        progress: 100,
        started_at: new Date('2024-02-01T00:00:00.000Z'),
        completed_at: new Date('2024-03-01T00:00:00.000Z'),
      },
    ],
    certificates: [
      {
        id: certificateId,
        user_id: userId,
        course_id: courseId,
        issued_at: new Date('2024-03-02T00:00:00.000Z'),
        pdf_url: 'https://example.com/cert.pdf',
        certificate_number: 'CERT-0001',
      },
    ],
  };

  it('assembles complete user aggregates from flat database rows', () => {
    const users = assembleUsers(validGraph);

    expect(users).toHaveLength(1);
    const user = users[0]!;
    expect(user.id).toBe(userId);
    expect(user.name.value).toBe('Ada Lovelace');
    expect(user.enrollments).toHaveLength(1);
    expect(user.enrollments[0]?.course.name.value).toBe('CompSci 101');
    expect(user.enrollments[0]?.course.modules).toHaveLength(1);
    expect(user.enrollments[0]?.course.instructor.name.value).toBe('Grace Hopper');
    expect(user.certificates).toHaveLength(1);
    expect(user.certificates[0]?.certificateNumber).toBe('CERT-0001');
  });

  it('throws CorruptedRecordError when course references missing instructor', () => {
    const corruptedGraph: UserGraphRows = {
      ...validGraph,
      instructors: [], // No instructors loaded
    };

    expect(() => assembleUsers(corruptedGraph)).toThrow(CorruptedRecordError);
  });

  it('throws CorruptedRecordError when enrollment references missing course', () => {
    const corruptedGraph: UserGraphRows = {
      ...validGraph,
      courses: [], // No courses loaded
    };

    expect(() => assembleUsers(corruptedGraph)).toThrow(CorruptedRecordError);
  });

  it('throws CorruptedRecordError when a row fails entity validation', () => {
    const corruptedGraph: UserGraphRows = {
      ...validGraph,
      users: [
        {
          ...validGraph.users[0]!,
          email: 'not-an-email',
        },
      ],
    };

    expect(() => assembleUsers(corruptedGraph)).toThrow(CorruptedRecordError);
  });
});
