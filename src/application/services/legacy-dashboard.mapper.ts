import type {
  LegacyCertificateDTO,
  LegacyCourseDTO,
  LegacyDashboardOutput,
  LegacyEnrollmentDTO,
  LegacyUserDTO,
} from '@application/dtos/legacy-dashboard.dto';
import type { Certificate } from '@domain/entities/certificate.entity';
import type { Course } from '@domain/entities/course.entity';
import type { Enrollment } from '@domain/entities/enrollment.entity';
import type { User } from '@domain/entities/user.entity';

const toCourseDTO = (course: Course): LegacyCourseDTO => ({
  id: course.id,
  name: course.name.value,
  description: course.description,
  category: course.category,
  durationHours: course.durationHours,
  instructor: {
    id: course.instructor.id,
    name: course.instructor.name.value,
    bio: course.instructor.bio,
    avatarUrl: course.instructor.avatarUrl.value,
  },
  modules: course.modules.map((module) => ({
    id: module.id,
    title: module.title,
    content: module.content,
    orderIndex: module.orderIndex,
  })),
});

const toCertificateDTO = (certificate: Certificate): LegacyCertificateDTO => ({
  id: certificate.id,
  userId: certificate.userId,
  courseId: certificate.courseId,
  issuedAt: certificate.issuedAt.toISOString(),
  pdfUrl: certificate.pdfUrl,
  certificateNumber: certificate.certificateNumber,
});

/**
 * Maps the aggregates to the v1 payload. Each course is mapped once and the same DTO is reused
 * by every enrollment — JSON.stringify still writes it out every time: that is the over-fetching.
 */
export const toLegacyDashboard = (users: readonly User[]): LegacyDashboardOutput => {
  const courses = new Map<string, LegacyCourseDTO>();
  const courseDTO = (course: Course): LegacyCourseDTO => {
    let dto = courses.get(course.id);
    if (dto === undefined) {
      dto = toCourseDTO(course);
      courses.set(course.id, dto);
    }
    return dto;
  };
  const toEnrollmentDTO = (enrollment: Enrollment): LegacyEnrollmentDTO => ({
    id: enrollment.id,
    userId: enrollment.userId,
    score: enrollment.score.value,
    progress: enrollment.progress.value,
    startedAt: enrollment.startedAt.toISOString(),
    completedAt: enrollment.completedAt?.toISOString() ?? null,
    course: courseDTO(enrollment.course),
  });

  return {
    total: users.length,
    users: users.map((user): LegacyUserDTO => ({
      id: user.id,
      name: user.name.value,
      email: user.email.value,
      avatarUrl: user.avatarUrl.value,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
      enrollments: user.enrollments.map(toEnrollmentDTO),
      certificates: user.certificates.map(toCertificateDTO),
    })),
  };
};
