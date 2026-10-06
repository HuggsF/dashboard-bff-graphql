import type { Knex } from 'knex';
import type { User } from '@domain/entities/user.entity';
import type {
  UserField,
  UserProjection,
  UserProjectionFilter,
  UserRepository,
} from '@domain/repositories/user.repository';
import { assembleUsers } from './user-aggregate.assembler';
import { TABLES } from './tables';
import type {
  CertificateRow,
  CourseRow,
  EnrollmentRow,
  InstructorRow,
  ModuleRow,
  UserRow,
} from './tables';

/** Whitelist: domain field → column. Client-provided names never reach SQL. */
export const USER_COLUMNS: Readonly<Record<UserField, keyof UserRow>> = {
  name: 'name',
  email: 'email',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  createdAt: 'created_at',
};

const unique = (values: readonly string[]): string[] => [...new Set(values)];

export class MySqlUserRepository implements UserRepository {
  constructor(private readonly db: Knex) {}

  /**
   * Legacy access path: `SELECT *` on the six tables (in parallel — the legacy endpoint is not
   * slow because of N+1, it is slow because of the VOLUME it reads, maps and serializes).
   */
  async findAll(): Promise<User[]> {
    const [users, enrollments, certificates, courses, instructors, modules] = await Promise.all([
      this.db<UserRow>(TABLES.users)
        .select('*')
        .orderBy([{ column: 'created_at' }, { column: 'id' }]),
      this.db<EnrollmentRow>(TABLES.enrollments)
        .select('*')
        .orderBy([{ column: 'started_at' }, { column: 'id' }]),
      this.db<CertificateRow>(TABLES.certificates)
        .select('*')
        .orderBy([{ column: 'issued_at' }, { column: 'id' }]),
      this.db<CourseRow>(TABLES.courses).select('*'),
      this.db<InstructorRow>(TABLES.instructors).select('*'),
      this.db<ModuleRow>(TABLES.modules).select('*'),
    ]);
    return assembleUsers({ users, enrollments, certificates, courses, instructors, modules });
  }

  async findAllProjected<F extends UserField>(
    fields: readonly F[],
    filter: UserProjectionFilter = {},
  ): Promise<UserProjection<F>[]> {
    if (filter.ids?.length === 0) {
      return [];
    }
    const selected = unique(fields) as F[];
    const query = this.db<UserRow>(TABLES.users)
      .select(['id', ...selected.map((field) => USER_COLUMNS[field])])
      .orderBy([{ column: 'created_at' }, { column: 'id' }]);
    if (filter.ids !== undefined) {
      void query.whereIn('id', unique(filter.ids));
    }
    const rows = (await query) as Partial<UserRow>[];

    return rows.map((row) => {
      const projection: Record<string, unknown> = { id: row.id };
      for (const field of selected) {
        projection[field] = row[USER_COLUMNS[field]];
      }
      return projection as UserProjection<F>;
    });
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.db<UserRow>(TABLES.users).where({ id }).first();
    if (user === undefined) {
      return null;
    }
    const [enrollments, certificates] = await Promise.all([
      this.db<EnrollmentRow>(TABLES.enrollments)
        .where({ user_id: id })
        .orderBy([{ column: 'started_at' }, { column: 'id' }]),
      this.db<CertificateRow>(TABLES.certificates)
        .where({ user_id: id })
        .orderBy([{ column: 'issued_at' }, { column: 'id' }]),
    ]);
    const courseIds = unique(enrollments.map((enrollment) => enrollment.course_id));
    const courses =
      courseIds.length === 0
        ? []
        : await this.db<CourseRow>(TABLES.courses).whereIn('id', courseIds);
    const instructorIds = unique(courses.map((course) => course.instructor_id));
    const [instructors, modules] =
      courseIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.db<InstructorRow>(TABLES.instructors).whereIn('id', instructorIds),
            this.db<ModuleRow>(TABLES.modules).whereIn('course_id', courseIds),
          ]);

    const [aggregate] = assembleUsers({
      users: [user],
      enrollments,
      certificates,
      courses,
      instructors,
      modules,
    });
    return aggregate ?? null;
  }

  async count(): Promise<number> {
    const [row] = await this.db(TABLES.users).count<{ total: number | string }[]>({ total: '*' });
    return Number(row?.total ?? 0);
  }
}
