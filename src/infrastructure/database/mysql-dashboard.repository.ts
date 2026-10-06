import type { Knex } from 'knex';
import type {
  DashboardField,
  DashboardPosition,
  DashboardRepository,
  DashboardSummaryProjection,
} from '@domain/repositories/dashboard.repository';
import { TABLES } from './tables';

type DashboardRow = {
  readonly id: string;
  readonly total_score: number | string;
  readonly name?: string;
  readonly avatar_url?: string | null;
  readonly completed_courses?: number | string;
};

/**
 * The dashboard is ONE aggregate query: MySQL sums the scores (covering index
 * `idx_enrollments_dashboard`) and returns only the projected columns of one page.
 *
 *   SELECT u.id, u.name, u.avatar_url, CAST(COALESCE(SUM(e.score), 0) AS UNSIGNED) AS total_score
 *   FROM users u LEFT JOIN enrollments e ON e.user_id = u.id
 *   GROUP BY u.id
 *   ORDER BY total_score DESC, u.id ASC
 *   LIMIT 20 OFFSET 0
 */
export class MySqlDashboardRepository implements DashboardRepository {
  constructor(private readonly db: Knex) {}

  async getDashboardSummary<F extends DashboardField>(
    page: number,
    pageSize: number,
    fields: readonly F[],
  ): Promise<DashboardSummaryProjection<F>[]> {
    const rows = (await this.rankedQuery(fields)
      .limit(pageSize)
      .offset((page - 1) * pageSize)) as DashboardRow[];
    return rows.map((row) => toProjection(row, fields));
  }

  /**
   * Keyset ("seek") pagination: the cursor is the (totalScore, id) of the last entry seen, so the
   * page boundary is stable even if rows are inserted between two requests.
   */
  async getDashboardSummaryAfter<F extends DashboardField>(
    after: DashboardPosition | null,
    limit: number,
    fields: readonly F[],
  ): Promise<DashboardSummaryProjection<F>[]> {
    const query = this.rankedQuery(fields).limit(limit);
    if (after !== null) {
      void query.havingRaw('total_score < ? OR (total_score = ? AND u.id > ?)', [
        after.totalScore,
        after.totalScore,
        after.id,
      ]);
    }
    const rows = (await query) as DashboardRow[];
    return rows.map((row) => toProjection(row, fields));
  }

  private rankedQuery(fields: readonly DashboardField[]): Knex.QueryBuilder {
    const query = this.db({ u: TABLES.users })
      .leftJoin({ e: TABLES.enrollments }, 'e.user_id', 'u.id')
      .select('u.id')
      .select(this.db.raw('CAST(COALESCE(SUM(e.score), 0) AS UNSIGNED) AS total_score'))
      .groupBy('u.id')
      .orderBy([
        { column: 'total_score', order: 'desc' },
        { column: 'u.id', order: 'asc' },
      ]);
    if (fields.includes('name')) {
      void query.select('u.name');
    }
    if (fields.includes('avatarUrl')) {
      void query.select('u.avatar_url');
    }
    if (fields.includes('completedCourses')) {
      void query.select(this.db.raw('COUNT(e.completed_at) AS completed_courses'));
    }
    return query;
  }
}

const toProjection = <F extends DashboardField>(
  row: DashboardRow,
  fields: readonly F[],
): DashboardSummaryProjection<F> => {
  const projection: Record<string, unknown> = { id: row.id, totalScore: Number(row.total_score) };
  for (const field of fields) {
    if (field === 'name') projection.name = row.name;
    if (field === 'avatarUrl') projection.avatarUrl = row.avatar_url ?? null;
    if (field === 'completedCourses') projection.completedCourses = Number(row.completed_courses);
  }
  return projection as DashboardSummaryProjection<F>;
};
