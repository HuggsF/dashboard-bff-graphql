import type { ReactElement } from 'react';
import { useBffDashboard } from '../hooks/use-bff-dashboard';
import { ENDPOINTS, PAGE_SIZE } from '../lib/api';
import { formatCount } from '../lib/format';
import { ApproachPanel } from './approach-panel';
import { Leaderboard } from './leaderboard';

export const BffPanel = (): ReactElement => {
  const { loading, error, measurement, data, page, goTo, reload } = useBffDashboard();
  const pagination = data?.pagination;

  return (
    <ApproachPanel
      approach="bff"
      method="GET"
      endpoint={ENDPOINTS.bff(page)}
      summary={
        <>
          Backend For Frontend: the SQL projects exactly{' '}
          <code>id, name, totalScore, avatarUrl</code>, ranks in the database and pages with OFFSET
          (plus a <code>COUNT</code> for the pagination metadata). Responses are gzip/brotli
          compressed.
        </>
      }
      loading={loading}
      error={error}
      measurement={measurement}
      records={data?.data.length ?? null}
      recordsHint={
        pagination === undefined ? undefined : `of ${formatCount(pagination.totalItems)} students`
      }
      note={
        pagination !== undefined && (
          <>
            Page {pagination.page} of {formatCount(pagination.totalPages)}: offset pagination, every
            page is a new request of the same size.
          </>
        )
      }
      onReload={reload}
      footer={
        <>
          <button
            type="button"
            className="button"
            onClick={() => goTo(page - 1)}
            disabled={loading || page <= 1}
          >
            ← Previous page
          </button>
          <button
            type="button"
            className="button"
            onClick={() => goTo(page + 1)}
            disabled={loading || pagination?.hasNext !== true}
          >
            Next page →
          </button>
        </>
      }
    >
      <Leaderboard rows={data?.data ?? []} firstRank={(page - 1) * PAGE_SIZE + 1} busy={loading} />
    </ApproachPanel>
  );
};
