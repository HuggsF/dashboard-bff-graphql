import type {
  CertificateNodeDTO,
  CourseNodeDTO,
  EnrollmentNodeDTO,
  InstructorNodeDTO,
  ModuleNodeDTO,
} from '@application/dtos/graph.dto';

/**
 * Batch lookups behind the GraphQL DataLoaders: every method answers for MANY keys with ONE
 * query (`WHERE ... IN (...)`). Results come back in any order; the loaders re-align them.
 */
export interface LearningGraphReader {
  findEnrollmentsByUserIds(userIds: readonly string[]): Promise<EnrollmentNodeDTO[]>;
  findCertificatesByUserIds(userIds: readonly string[]): Promise<CertificateNodeDTO[]>;
  findCoursesByIds(courseIds: readonly string[]): Promise<CourseNodeDTO[]>;
  findInstructorsByIds(instructorIds: readonly string[]): Promise<InstructorNodeDTO[]>;
  findModulesByCourseIds(courseIds: readonly string[]): Promise<ModuleNodeDTO[]>;
}
