import { toLegacyDashboard } from '@application/services/legacy-dashboard.mapper';
import {
  buildCertificate,
  buildCourse,
  buildEnrollment,
  buildUser,
  uuid,
} from '../../../support/builders';

describe('Legacy Dashboard Mapper', () => {
  it('maps users with enrollments, certificates and shared courses', () => {
    const course = buildCourse({ id: uuid(3, 1), name: 'Distributed Systems' });
    const user1Id = uuid(9, 1);
    const user2Id = uuid(9, 2);

    const enrollment1 = buildEnrollment({
      id: uuid(4, 1),
      userId: user1Id,
      course,
      score: 95,
      completedAt: new Date('2025-03-01T00:00:00.000Z'),
    });
    const enrollment2 = buildEnrollment({
      id: uuid(4, 2),
      userId: user2Id,
      course,
      score: 80,
      completedAt: null,
    });
    const certificate1 = buildCertificate({
      id: uuid(5, 1),
      userId: user1Id,
      courseId: course.id,
    });

    const user1 = buildUser({
      id: user1Id,
      enrollments: [enrollment1],
      certificates: [certificate1],
    });
    const user2 = buildUser({
      id: user2Id,
      enrollments: [enrollment2],
      certificates: [],
    });

    const result = toLegacyDashboard([user1, user2]);

    expect(result.total).toBe(2);
    expect(result.users).toHaveLength(2);
    const user1Dto = result.users[0]!;
    const user2Dto = result.users[1]!;
    expect(user1Dto.id).toBe(user1.id);
    expect(user1Dto.enrollments).toHaveLength(1);
    expect(user1Dto.enrollments[0]?.course.name).toBe('Distributed Systems');
    // Ensure course DTO reference is cached/reused in mapper across users
    expect(user1Dto.enrollments[0]?.course).toBe(user2Dto.enrollments[0]?.course);
    expect(user2Dto.enrollments[0]?.completedAt).toBeNull();
    expect(user1Dto.certificates).toHaveLength(1);
    expect(user1Dto.certificates[0]?.id).toBe(certificate1.id);
  });

  it('handles empty user list', () => {
    const result = toLegacyDashboard([]);
    expect(result.total).toBe(0);
    expect(result.users).toEqual([]);
  });
});
