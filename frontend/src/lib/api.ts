import { gql } from '@apollo/client';
import type { TypedDocumentNode } from '@apollo/client';

/** One row of the dashboard card: the only 3 fields the UI renders (+ id as list key). */
export type LeaderboardRow = {
  readonly id: string;
  readonly name: string;
  readonly totalScore: number;
  readonly avatarUrl: string | null;
};

// ── v1 · legacy REST (GET /api/v1/dashboard): every user with every relation ───────────────────
// Only the fields this UI reads are typed; the payload carries much more (bio, modules' content…).
type LegacyEnrollment = {
  readonly score: number;
  readonly course: { readonly modules: readonly unknown[] };
};
export type LegacyUser = {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly enrollments: readonly LegacyEnrollment[];
  readonly certificates: readonly unknown[];
};
export type LegacyDashboardResponse = {
  readonly total: number;
  readonly users: readonly LegacyUser[];
};

// ── v2 · BFF REST (GET /api/v2/dashboard?page=&size=): projection + offset pagination ──────────
export type BffDashboardResponse = {
  readonly data: readonly LeaderboardRow[];
  readonly pagination: {
    readonly page: number;
    readonly size: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
  };
};

// ── v3 · GraphQL (POST /graphql): exactly the requested fields + cursor pagination ─────────────
export type DashboardQueryData = {
  readonly dashboard: {
    readonly edges: readonly { readonly node: LeaderboardRow }[];
    readonly pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null };
  };
};
export type DashboardQueryVariables = { readonly pageSize: number; readonly after?: string | null };

/**
 * Same selection as the backend benchmark (src/presentation/compare/payload-sources.ts). No
 * per-edge `cursor` (+1.7 KB per page): `pageInfo.endCursor` is all "Load more" needs. Apollo
 * still adds `__typename` to every selection set for its normalized cache (+1.2 KB).
 */
export const DASHBOARD_QUERY: TypedDocumentNode<DashboardQueryData, DashboardQueryVariables> = gql`
  query Dashboard($pageSize: Int, $after: String) {
    dashboard(pageSize: $pageSize, after: $after) {
      edges {
        node {
          id
          name
          totalScore
          avatarUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PAGE_SIZE = 20;

export const ENDPOINTS = {
  legacy: '/api/v1/dashboard',
  bff: (page: number): string => `/api/v2/dashboard?page=${page}&size=${PAGE_SIZE}`,
  graphql: '/graphql',
} as const;

/**
 * What the legacy client has to do itself: download 1,000 full user graphs, sum the scores and
 * sort them, just to show 20 names. Same ordering as the BFF (score desc, id asc).
 */
export const rankLegacyUsers = (users: readonly LegacyUser[]): LeaderboardRow[] =>
  users
    .map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      totalScore: user.enrollments.reduce((sum, enrollment) => sum + enrollment.score, 0),
    }))
    .sort((a, b) => b.totalScore - a.totalScore || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
