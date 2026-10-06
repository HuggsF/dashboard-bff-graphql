import type { ReactElement } from 'react';
import { useGraphqlDashboard } from '../hooks/use-graphql-dashboard';
import { ENDPOINTS, PAGE_SIZE } from '../lib/api';
import { formatCount } from '../lib/format';
import { ApproachPanel } from './approach-panel';
import { Leaderboard } from './leaderboard';

const QUERY_PREVIEW = `dashboard(pageSize: ${PAGE_SIZE}, after: $cursor) {
  edges { node { id name totalScore avatarUrl } }
  pageInfo { hasNextPage endCursor }
}`;

export const GraphqlPanel = (): ReactElement => {
  const { loading, loadingMore, error, lastCall, rows, hasNextPage, loadMore, reload } =
    useGraphqlDashboard();

  return (
    <ApproachPanel
      approach="graphql"
      method="POST"
      endpoint={ENDPOINTS.graphql}
      summary={
        <>
          The client asks for exactly the fields it renders. Keyset cursor pagination; a
          request-scoped DataLoader batches the relations other queries ask for (no N+1).
        </>
      }
      loading={loading || loadingMore}
      error={error}
      measurement={lastCall?.measurement ?? null}
      records={lastCall?.records ?? null}
      recordsHint="edges in the last response"
      note={
        rows.length > 0 && (
          <>
            {formatCount(rows.length)} students loaded with Apollo Client. Metrics show the latest
            request (Apollo adds <code>__typename</code> to every selection).
          </>
        )
      }
      onReload={reload}
      footer={
        hasNextPage && (
          <button
            type="button"
            className="button"
            onClick={loadMore}
            disabled={loading || loadingMore}
          >
            {loadingMore ? 'Loading…' : `Load ${PAGE_SIZE} more`}{' '}
            <span className="button__hint">after: endCursor</span>
          </button>
        )
      }
    >
      <details className="query">
        <summary>Query</summary>
        <pre>
          <code>{QUERY_PREVIEW}</code>
        </pre>
      </details>
      <Leaderboard rows={rows} busy={loading} />
    </ApproachPanel>
  );
};
