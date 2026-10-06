import type {
  DashboardEdgeDTO,
  GetDashboardGraphQLInput,
  GetDashboardGraphQLOutput,
} from '@application/dtos/graphql-dashboard.dto';
import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { UnexpectedError } from '@application/errors/unexpected.error';
import { selectFields } from '@application/services/field-selection';
import {
  DEFAULT_PAGINATION_POLICY,
  resolvePage,
  resolvePageSize,
} from '@application/services/pagination-policy';
import type { PaginationPolicy } from '@application/services/pagination-policy';
import type {
  DashboardField,
  DashboardRepository,
  DashboardSummaryProjection,
} from '@domain/repositories/dashboard.repository';
import type { UserRepository } from '@domain/repositories/user.repository';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

/** Optional columns of a `DashboardEntry`; `id` and `totalScore` are always read (sort key). */
export const DASHBOARD_ENTRY_FIELDS = [
  'name',
  'avatarUrl',
  'completedCourses',
] as const satisfies readonly DashboardField[];

/**
 * v3 — GraphQL. The client's selection set drives the SQL: only the requested columns are read,
 * `completedCourses` is aggregated only when asked for, and `totalCount` costs a query only when
 * selected. Pagination is keyset-based (`after` cursor); `page` gives OFFSET random access.
 */
export class GetDashboardGraphQLUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly userRepository: Pick<UserRepository, 'count'>,
    private readonly policy: PaginationPolicy = DEFAULT_PAGINATION_POLICY,
  ) {}

  async execute(
    input: GetDashboardGraphQLInput,
  ): Promise<Result<GetDashboardGraphQLOutput, InvalidPaginationError | UnexpectedError>> {
    const size = resolvePageSize(input.pageSize, this.policy, 'pageSize');
    if (!size.success) {
      return size;
    }
    const hasPage = input.page !== undefined && input.page !== null;
    const hasCursor = input.after !== undefined && input.after !== null;
    if (hasPage && hasCursor) {
      return fail(new InvalidPaginationError('page', 'Use either "page" or "after", not both'));
    }
    const fields = selectFields(input.fields, DASHBOARD_ENTRY_FIELDS);

    try {
      if (hasPage) {
        return await this.offsetPage(input.page, size.data, fields);
      }
      return ok(await this.keysetPage(input, size.data, fields));
    } catch (error: unknown) {
      return fail(new UnexpectedError('Loading the GraphQL dashboard', error));
    }
  }

  /** One query (+1 for `totalCount` when selected): fetch one extra row to know if more exist. */
  private async keysetPage(
    input: GetDashboardGraphQLInput,
    size: number,
    fields: readonly DashboardField[],
  ): Promise<GetDashboardGraphQLOutput> {
    const [rows, totalCount] = await Promise.all([
      this.dashboardRepository.getDashboardSummaryAfter(input.after ?? null, size + 1, fields),
      input.includeTotalCount ? this.userRepository.count() : Promise.resolve(null),
    ]);
    return {
      edges: rows.slice(0, size).map(toEdge),
      hasNextPage: rows.length > size,
      totalCount,
    };
  }

  /** OFFSET access needs the total to know whether a next page exists (two queries). */
  private async offsetPage(
    rawPage: number | null | undefined,
    size: number,
    fields: readonly DashboardField[],
  ): Promise<Result<GetDashboardGraphQLOutput, InvalidPaginationError>> {
    const page = resolvePage(rawPage);
    if (!page.success) {
      return page;
    }
    const [rows, totalCount] = await Promise.all([
      this.dashboardRepository.getDashboardSummary(page.data, size, fields),
      this.userRepository.count(),
    ]);
    return ok({
      edges: rows.map(toEdge),
      hasNextPage: page.data * size < totalCount,
      totalCount,
    });
  }
}

const toEdge = (row: DashboardSummaryProjection<DashboardField>): DashboardEdgeDTO => ({
  position: { totalScore: row.totalScore, id: row.id },
  node: { ...row },
});
