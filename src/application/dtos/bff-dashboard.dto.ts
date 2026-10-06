export type GetDashboardBFFInput = {
  /** 1-based page number (default 1). */
  readonly page?: number | null;
  /** Entries per page (default and maximum come from the PaginationPolicy). */
  readonly size?: number | null;
};

/** Exactly what the dashboard screen renders: a key, the name, the score and the avatar. */
export type DashboardItemDTO = {
  readonly id: string;
  readonly name: string;
  readonly totalScore: number;
  readonly avatarUrl: string | null;
};

export type OffsetPaginationDTO = {
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
};

export type GetDashboardBFFOutput = {
  readonly data: readonly DashboardItemDTO[];
  readonly pagination: OffsetPaginationDTO;
};
