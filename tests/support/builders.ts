import { Certificate } from '@domain/entities/certificate.entity';
import type { CertificateProps } from '@domain/entities/certificate.entity';
import { Course } from '@domain/entities/course.entity';
import type { CourseProps } from '@domain/entities/course.entity';
import { Enrollment } from '@domain/entities/enrollment.entity';
import type { EnrollmentProps } from '@domain/entities/enrollment.entity';
import { Instructor } from '@domain/entities/instructor.entity';
import type { InstructorProps } from '@domain/entities/instructor.entity';
import { Module } from '@domain/entities/module.entity';
import type { ModuleProps } from '@domain/entities/module.entity';
import { User } from '@domain/entities/user.entity';
import type { UserProps } from '@domain/entities/user.entity';
import type { Result } from '@domain/shared/result';

/** Unwraps a factory result in tests: a failure means the fixture itself is wrong. */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (!result.success) {
    throw new Error(`Invalid fixture: ${String(result.error)}`);
  }
  return result.data;
};

export const uuid = (prefix: number, index: number): string =>
  `0199${String(prefix).padStart(4, '0')}-0000-7000-8000-${String(index).padStart(12, '0')}`;

export const instructorProps = (overrides: Partial<InstructorProps> = {}): InstructorProps => ({
  id: uuid(1, 1),
  name: 'Grace Hopper',
  bio: 'Rear admiral and computer scientist.',
  avatarUrl: 'https://i.pravatar.cc/150?img=1',
  ...overrides,
});

export const buildInstructor = (overrides: Partial<InstructorProps> = {}): Instructor =>
  unwrap(Instructor.create(instructorProps(overrides)));

export const moduleProps = (overrides: Partial<ModuleProps> = {}): ModuleProps => ({
  id: uuid(2, 1),
  title: '1. Introduction',
  content: 'What we are going to learn.',
  orderIndex: 0,
  ...overrides,
});

export const buildModule = (overrides: Partial<ModuleProps> = {}): Module =>
  unwrap(Module.create(moduleProps(overrides)));

export const courseProps = (overrides: Partial<CourseProps> = {}): CourseProps => ({
  id: uuid(3, 1),
  name: 'Node.js Streams',
  description: 'Backpressure, pipelines and memory.',
  category: 'Programming',
  durationHours: 12,
  instructor: buildInstructor(),
  modules: [
    buildModule({ id: uuid(2, 2), title: '2. Pipelines', orderIndex: 1 }),
    buildModule({ id: uuid(2, 1), title: '1. Introduction', orderIndex: 0 }),
  ],
  ...overrides,
});

export const buildCourse = (overrides: Partial<CourseProps> = {}): Course =>
  unwrap(Course.create(courseProps(overrides)));

export const USER_ID = uuid(9, 1);

export const enrollmentProps = (overrides: Partial<EnrollmentProps> = {}): EnrollmentProps => ({
  id: uuid(4, 1),
  userId: USER_ID,
  course: buildCourse(),
  score: 80,
  progress: 100,
  startedAt: new Date('2025-01-10T10:00:00.000Z'),
  completedAt: new Date('2025-02-10T10:00:00.000Z'),
  ...overrides,
});

export const buildEnrollment = (overrides: Partial<EnrollmentProps> = {}): Enrollment =>
  unwrap(Enrollment.create(enrollmentProps(overrides)));

export const certificateProps = (overrides: Partial<CertificateProps> = {}): CertificateProps => ({
  id: uuid(5, 1),
  userId: USER_ID,
  courseId: uuid(3, 1),
  issuedAt: new Date('2025-02-11T10:00:00.000Z'),
  pdfUrl: 'https://certificates.edtech.example/CERT-2025-000001.pdf',
  certificateNumber: 'CERT-2025-000001',
  ...overrides,
});

export const buildCertificate = (overrides: Partial<CertificateProps> = {}): Certificate =>
  unwrap(Certificate.create(certificateProps(overrides)));

export const userProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: USER_ID,
  name: 'Ada Lovelace',
  email: 'ada@school.edu',
  avatarUrl: 'https://i.pravatar.cc/150?u=1',
  bio: 'First programmer.',
  enrollments: [],
  certificates: [],
  createdAt: new Date('2024-05-01T08:00:00.000Z'),
  ...overrides,
});

export const buildUser = (overrides: Partial<UserProps> = {}): User =>
  unwrap(User.create(userProps(overrides)));
