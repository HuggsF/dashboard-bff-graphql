import { NetworkStatus } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useSyncExternalStore } from 'react';
import { DASHBOARD_QUERY, PAGE_SIZE } from '../lib/api';
import type { LeaderboardRow } from '../lib/api';
import { graphqlMeasurements } from '../lib/apollo';
import type { ApproachResult } from '../lib/types';

export type GraphqlDashboard = {
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
  /** Latest GraphQL call: its measurement and the edges it returned. */
  readonly lastCall: ApproachResult | null;
  /** Every node loaded so far (pages are appended by the cache's relayStylePagination). */
  readonly rows: readonly LeaderboardRow[];
  readonly hasNextPage: boolean;
  readonly loadMore: () => void;
  readonly reload: () => void;
};

/** Cursor pagination: "Load more" sends the last `endCursor` as `after`. */
export const useGraphqlDashboard = (): GraphqlDashboard => {
  const { data, error, networkStatus, fetchMore, refetch } = useQuery(DASHBOARD_QUERY, {
    variables: { pageSize: PAGE_SIZE },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const lastCall = useSyncExternalStore(
    graphqlMeasurements.subscribe,
    graphqlMeasurements.getSnapshot,
  );

  const connection = data?.dashboard;
  const pageInfo = connection?.pageInfo;

  return {
    loading: networkStatus === NetworkStatus.loading || networkStatus === NetworkStatus.refetch,
    loadingMore: networkStatus === NetworkStatus.fetchMore,
    error: error?.message ?? null,
    lastCall,
    rows: connection?.edges.map((edge) => edge.node) ?? [],
    hasNextPage: pageInfo?.hasNextPage ?? false,
    loadMore: () => {
      if (pageInfo?.endCursor) void fetchMore({ variables: { after: pageInfo.endCursor } });
    },
    reload: () => void refetch({ pageSize: PAGE_SIZE, after: null }),
  };
};
