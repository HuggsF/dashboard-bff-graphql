import { Certificate } from '@domain/entities/certificate.entity';
import { Course } from '@domain/entities/course.entity';
import { Enrollment } from '@domain/entities/enrollment.entity';
import { Instructor } from '@domain/entities/instructor.entity';
import { Module } from '@domain/entities/module.entity';
import { User } from '@domain/entities/user.entity';
import type { InvalidEntityError } from '@domain/errors/invalid-entity.error';
import type { Result } from '@domain/shared/result';
import { CorruptedRecordError } from './corrupted-record.error';
import { TABLES } from './tables';
import type {
  CertificateRow,
  CourseRow,
  EnrollmentRow,
  InstructorRow,
  ModuleRow,
  UserRow,
} from './tables';

export type UserGraphRows = {
  readonly users: readonly UserRow[];
  readonly enrollments: readonly EnrollmentRow[];
  readonly certificates: readonly CertificateRow[];
  readonly courses: readonly CourseRow[];
  readonly instructors: readonly InstructorRow[];
  readonly modules: readonly ModuleRow[];
};

const unwrap = <T>(result: Result<T, InvalidEntityError>, table: string, id: string): T => {
  if (!result.success) {
    throw new CorruptedRecordError(table, id, result.error);
  }
  return result.data;
};

const groupBy = <T>(rows: readonly T[], keyOf: (row: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [row]);
    } else {
      group.push(row);
    }
  }
  return groups;
};

const required = <T>(value: T | undefined, table: string, id: string, reason: string): T => {
  if (value === undefined) {
    throw new CorruptedRecordError(table, id, reason);
  }
  return value;
};

/**
 * Rebuilds User aggregates (with their enrollments → course → instructor + modules, and
 * certificates) from flat rows. Every row goes through the entity factories, so invalid data
 * never leaves the repository silently.
 */
export const assembleUsers = (rows: UserGraphRows): User[] => {
  const instructors = new Map(
    rows.instructors.map((row) => [
      row.id,
      unwrap(
        Instructor.create({
          id: row.id,
          name: row.name,
          bio: row.bio,
          avatarUrl: row.avatar_url,
        }),
        TABLES.instructors,
        row.id,
      ),
    ]),
  );
  const modulesByCourse = groupBy(rows.modules, (row) => row.course_id);
  const courses = new Map(
    rows.courses.map((row) => [
      row.id,
      unwrap(
        Course.create({
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          durationHours: row.duration_hours,
          instructor: required(
            instructors.get(row.instructor_id),
            TABLES.courses,
            row.id,
            `instructor ${row.instructor_id} not loaded`,
          ),
          modules: (modulesByCourse.get(row.id) ?? []).map((module) =>
            unwrap(
              Module.create({
                id: module.id,
                title: module.title,
                content: module.content,
                orderIndex: module.order_index,
              }),
              TABLES.modules,
              module.id,
            ),
          ),
        }),
        TABLES.courses,
        row.id,
      ),
    ]),
  );
  const enrollmentsByUser = groupBy(rows.enrollments, (row) => row.user_id);
  const certificatesByUser = groupBy(rows.certificates, (row) => row.user_id);

  return rows.users.map((row) =>
    unwrap(
      User.create({
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        createdAt: row.created_at,
        enrollments: (enrollmentsByUser.get(row.id) ?? []).map((enrollment) =>
          unwrap(
            Enrollment.create({
              id: enrollment.id,
              userId: enrollment.user_id,
              course: required(
                courses.get(enrollment.course_id),
                TABLES.enrollments,
                enrollment.id,
                `course ${enrollment.course_id} not loaded`,
              ),
              score: enrollment.score,
              progress: enrollment.progress,
              startedAt: enrollment.started_at,
              completedAt: enrollment.completed_at,
            }),
            TABLES.enrollments,
            enrollment.id,
          ),
        ),
        certificates: (certificatesByUser.get(row.id) ?? []).map((certificate) =>
          unwrap(
            Certificate.create({
              id: certificate.id,
              userId: certificate.user_id,
              courseId: certificate.course_id,
              issuedAt: certificate.issued_at,
              pdfUrl: certificate.pdf_url,
              certificateNumber: certificate.certificate_number,
            }),
            TABLES.certificates,
            certificate.id,
          ),
        ),
      }),
      TABLES.users,
      row.id,
    ),
  );
};
