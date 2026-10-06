import type {
  DashboardItemDTO,
  GetDashboardBFFInput,
  GetDashboardBFFOutput,
} from '@application/dtos/bff-dashboard.dto';
import type { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { UnexpectedError } from '@application/errors/unexpected.error';
import {
  DEFAULT_PAGINATION_POLICY,
  resolvePage,
  resolvePageSize,
} from '@application/services/pagination-policy';
import type { PaginationPolicy } from '@application/services/pagination-policy';
import type {
  DashboardField,
  DashboardRepository,
} from '@domain/repositories/dashboard.repository';
import type { UserRepository } from '@domain/repositories/user.repository';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

/** The only columns the dashboard screen needs (id and totalScore always come with an entry). */
export const BFF_DASHBOARD_FIELDS = [
  'name',
  'avatarUrl',
] as const satisfies readonly DashboardField[];

/**
 * v2 — Backend For Frontend. The API is shaped by the screen: an SQL projection reads only the
 * rendered columns, the score is aggregated by MySQL, and results are paginated (OFFSET).
 */
export class GetDashboardBFFUseCase {
  constructor(
    private readonly dashboardRepository: Pick<DashboardRepository, 'getDashboardSummary'>,
    private readonly userRepository: Pick<UserRepository, 'count'>,
    private readonly policy: PaginationPolicy = DEFAULT_PAGINATION_POLICY,
  ) {}

  async execute(
    input: GetDashboardBFFInput,
  ): Promise<Result<GetDashboardBFFOutput, InvalidPaginationError | UnexpectedError>> {
    const page = resolvePage(input.page);
    if (!page.success) {
      return page;
    }
    const size = resolvePageSize(input.size, this.policy);
    if (!size.success) {
      return size;
    }

    try {
      // Both queries are independent: run them concurrently (one round-trip of latency).
      const [rows, totalItems] = await Promise.all([
        this.dashboardRepository.getDashboardSummary(page.data, size.data, BFF_DASHBOARD_FIELDS),
        this.userRepository.count(),
      ]);
      const totalPages = Math.ceil(totalItems / size.data);
      return ok({
        data: rows.map((row): DashboardItemDTO => ({
          id: row.id,
          name: row.name,
          totalScore: row.totalScore,
          avatarUrl: row.avatarUrl,
        })),
        pagination: {
          page: page.data,
          size: size.data,
          totalItems,
          totalPages,
          hasNext: page.data < totalPages,
        },
      });
    } catch (error: unknown) {
      return fail(new UnexpectedError('Loading the BFF dashboard', error));
    }
  }
}
