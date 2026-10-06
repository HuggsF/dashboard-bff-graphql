import type { Knex } from 'knex';
import type {
  CertificateNodeDTO,
  CourseNodeDTO,
  EnrollmentNodeDTO,
  InstructorNodeDTO,
  ModuleNodeDTO,
} from '@application/dtos/graph.dto';
import type { LearningGraphReader } from '@application/interfaces/learning-graph.reader';
import { TABLES } from './tables';
import type { CertificateRow, CourseRow, EnrollmentRow, InstructorRow, ModuleRow } from './tables';

const unique = (values: readonly string[]): string[] => [...new Set(values)];

/** One `WHERE … IN (…)` query per call, whatever the number of keys (DataLoader batches). */
export class MySqlLearningGraphReader implements LearningGraphReader {
  constructor(private readonly db: Knex) {}

  async findEnrollmentsByUserIds(userIds: readonly string[]): Promise<EnrollmentNodeDTO[]> {
    if (userIds.length === 0) return [];
    const rows = await this.db<EnrollmentRow>(TABLES.enrollments)
      .select('id', 'user_id', 'course_id', 'score', 'progress', 'started_at', 'completed_at')
      .whereIn('user_id', unique(userIds))
      .orderBy([{ column: 'started_at' }, { column: 'id' }]);
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      score: row.score,
      progress: row.progress,
      startedAt: row.started_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
    }));
  }

  async findCertificatesByUserIds(userIds: readonly string[]): Promise<CertificateNodeDTO[]> {
    if (userIds.length === 0) return [];
    const rows = await this.db<CertificateRow>(TABLES.certificates)
      .select('id', 'user_id', 'course_id', 'issued_at', 'pdf_url', 'certificate_number')
      .whereIn('user_id', unique(userIds))
      .orderBy([{ column: 'issued_at' }, { column: 'id' }]);
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      issuedAt: row.issued_at.toISOString(),
      pdfUrl: row.pdf_url,
      certificateNumber: row.certificate_number,
    }));
  }

  async findCoursesByIds(courseIds: readonly string[]): Promise<CourseNodeDTO[]> {
    if (courseIds.length === 0) return [];
    const rows = await this.db<CourseRow>(TABLES.courses)
      .select('id', 'name', 'description', 'category', 'duration_hours', 'instructor_id')
      .whereIn('id', unique(courseIds));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      durationHours: row.duration_hours,
      instructorId: row.instructor_id,
    }));
  }

  async findInstructorsByIds(instructorIds: readonly string[]): Promise<InstructorNodeDTO[]> {
    if (instructorIds.length === 0) return [];
    const rows = await this.db<InstructorRow>(TABLES.instructors)
      .select('id', 'name', 'bio', 'avatar_url')
      .whereIn('id', unique(instructorIds));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
    }));
  }

  async findModulesByCourseIds(courseIds: readonly string[]): Promise<ModuleNodeDTO[]> {
    if (courseIds.length === 0) return [];
    const rows = await this.db<ModuleRow>(TABLES.modules)
      .select('id', 'course_id', 'title', 'content', 'order_index')
      .whereIn('course_id', unique(courseIds))
      .orderBy([{ column: 'course_id' }, { column: 'order_index' }]);
    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      content: row.content,
      orderIndex: row.order_index,
    }));
  }
}
