import type { DashboardPosition } from '@domain/repositories/dashboard.repository';

export type GetDashboardGraphQLInput = {
  readonly pageSize?: number | null;
  /** OFFSET access to an arbitrary page (1-based). Mutually exclusive with `after`. */
  readonly page?: number | null;
  /** Keyset access: entries ranked after this (decoded) cursor. */
  readonly after?: DashboardPosition | null;
  /** Fields of `DashboardEntry` selected by the client. */
  readonly fields: readonly string[];
  /** `totalCount` costs one extra query: it is computed only when the client asks for it. */
  readonly includeTotalCount: boolean;
};

export type DashboardEntryDTO = {
  readonly id: string;
  readonly totalScore: number;
  readonly name?: string;
  readonly avatarUrl?: string | null;
  readonly completedCourses?: number;
};

export type DashboardEdgeDTO = {
  /** Ranking position of the node - the presentation layer turns it into an opaque cursor. */
  readonly position: DashboardPosition;
  readonly node: DashboardEntryDTO;
};

export type GetDashboardGraphQLOutput = {
  readonly edges: readonly DashboardEdgeDTO[];
  readonly hasNextPage: boolean;
  readonly totalCount: number | null;
};
