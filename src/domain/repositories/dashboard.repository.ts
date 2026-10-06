/**
 * Read model of the student dashboard: one entry per user.
 *
 * Ranking rule (same as `User.totalScore`): entries are ordered by the sum of the user's
 * enrollment scores, descending; ties are broken by user id, ascending. The pair
 * (totalScore, id) is therefore a unique, stable sort key — usable for keyset pagination.
 */
export type DashboardSummary = {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly totalScore: number;
  readonly completedCourses: number;
};

/** Optional columns of an entry. `id` and `totalScore` (the sort key) are always returned. */
export type DashboardField = 'name' | 'avatarUrl' | 'completedCourses';

export type DashboardSummaryProjection<F extends DashboardField> = Pick<
  DashboardSummary,
  'id' | 'totalScore'
> &
  Pick<DashboardSummary, F>;

/** Position of an entry in the ranking — what an opaque GraphQL cursor encodes. */
export type DashboardPosition = {
  readonly totalScore: number;
  readonly id: string;
};

export interface DashboardRepository {
  /** OFFSET pagination (REST): `page` is 1-based. */
  getDashboardSummary<F extends DashboardField>(
    page: number,
    pageSize: number,
    fields: readonly F[],
  ): Promise<DashboardSummaryProjection<F>[]>;
  /** Keyset pagination (GraphQL): the `limit` entries ranked right after `after` (or the first ones). */
  getDashboardSummaryAfter<F extends DashboardField>(
    after: DashboardPosition | null,
    limit: number,
    fields: readonly F[],
  ): Promise<DashboardSummaryProjection<F>[]>;
}
