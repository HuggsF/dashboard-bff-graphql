/** Table names and raw row shapes, as returned by mysql2 (snake_case columns). */
export const TABLES = {
  users: 'users',
  instructors: 'instructors',
  courses: 'courses',
  modules: 'modules',
  enrollments: 'enrollments',
  certificates: 'certificates',
} as const;

/** Deletion order that respects the foreign keys (children first). */
export const TABLES_CHILDREN_FIRST = [
  TABLES.certificates,
  TABLES.enrollments,
  TABLES.modules,
  TABLES.courses,
  TABLES.instructors,
  TABLES.users,
] as const;

export type UserRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly avatar_url: string | null;
  readonly bio: string;
  readonly created_at: Date;
};

export type InstructorRow = {
  readonly id: string;
  readonly name: string;
  readonly bio: string;
  readonly avatar_url: string | null;
};

export type CourseRow = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly duration_hours: number;
  readonly instructor_id: string;
};

export type ModuleRow = {
  readonly id: string;
  readonly course_id: string;
  readonly title: string;
  readonly content: string;
  readonly order_index: number;
};

export type EnrollmentRow = {
  readonly id: string;
  readonly user_id: string;
  readonly course_id: string;
  readonly score: number;
  readonly progress: number;
  readonly started_at: Date;
  readonly completed_at: Date | null;
};

export type CertificateRow = {
  readonly id: string;
  readonly user_id: string;
  readonly course_id: string;
  readonly issued_at: Date;
  readonly pdf_url: string;
  readonly certificate_number: string;
};
