import type {
  CertificateNodeDTO,
  CourseNodeDTO,
  EnrollmentNodeDTO,
  InstructorNodeDTO,
  ModuleNodeDTO,
} from '@application/dtos/graph.dto';
import type { BatchLoader, BatchLoaderFactory } from '@application/interfaces/batch-loader';
import type { LearningGraphReader } from '@application/interfaces/learning-graph.reader';

/**
 * Per-request loaders used by the GraphQL resolvers. Each one turns the N lookups issued while
 * resolving one level of a query into ONE `WHERE … IN (…)` query: N+1 becomes 1+1.
 */
export type LearningGraphLoaders = {
  readonly enrollmentsByUserId: BatchLoader<string, readonly EnrollmentNodeDTO[]>;
  readonly certificatesByUserId: BatchLoader<string, readonly CertificateNodeDTO[]>;
  /** CourseLoader — the course of each enrollment / certificate. */
  readonly courseById: BatchLoader<string, CourseNodeDTO | null>;
  /** InstructorLoader — the instructor of each course. */
  readonly instructorById: BatchLoader<string, InstructorNodeDTO | null>;
  /** ModuleLoader — the modules of each course, ordered by position. */
  readonly modulesByCourseId: BatchLoader<string, readonly ModuleNodeDTO[]>;
};

/** One value per key (or null when missing), aligned with the order of the keys. */
export const alignOne = <V>(
  keys: readonly string[],
  rows: readonly V[],
  keyOf: (row: V) => string,
): (V | null)[] => {
  const byKey = new Map(rows.map((row) => [keyOf(row), row]));
  return keys.map((key) => byKey.get(key) ?? null);
};

/** Every row of each key (possibly none), aligned with the order of the keys. */
export const alignMany = <V>(
  keys: readonly string[],
  rows: readonly V[],
  keyOf: (row: V) => string,
): V[][] => {
  const byKey = new Map<string, V[]>(keys.map((key) => [key, []]));
  for (const row of rows) {
    byKey.get(keyOf(row))?.push(row);
  }
  return keys.map((key) => byKey.get(key) ?? []);
};

export const createLearningGraphLoaders = (
  reader: LearningGraphReader,
  factory: BatchLoaderFactory,
): LearningGraphLoaders => ({
  enrollmentsByUserId: factory.create(
    'enrollmentsByUserId',
    async (userIds: readonly string[]): Promise<EnrollmentNodeDTO[][]> =>
      alignMany(userIds, await reader.findEnrollmentsByUserIds(userIds), (row) => row.userId),
  ),
  certificatesByUserId: factory.create(
    'certificatesByUserId',
    async (userIds: readonly string[]): Promise<CertificateNodeDTO[][]> =>
      alignMany(userIds, await reader.findCertificatesByUserIds(userIds), (row) => row.userId),
  ),
  courseById: factory.create(
    'courseById',
    async (courseIds: readonly string[]): Promise<(CourseNodeDTO | null)[]> =>
      alignOne(courseIds, await reader.findCoursesByIds(courseIds), (row) => row.id),
  ),
  instructorById: factory.create(
    'instructorById',
    async (instructorIds: readonly string[]): Promise<(InstructorNodeDTO | null)[]> =>
      alignOne(instructorIds, await reader.findInstructorsByIds(instructorIds), (row) => row.id),
  ),
  modulesByCourseId: factory.create(
    'modulesByCourseId',
    async (courseIds: readonly string[]): Promise<ModuleNodeDTO[][]> =>
      alignMany(courseIds, await reader.findModulesByCourseIds(courseIds), (row) => row.courseId),
  ),
});
