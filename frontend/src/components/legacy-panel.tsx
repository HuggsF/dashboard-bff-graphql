import { useState } from 'react';
import type { ReactElement } from 'react';
import { useLegacyDashboard } from '../hooks/use-legacy-dashboard';
import { ENDPOINTS, PAGE_SIZE } from '../lib/api';
import { formatCount } from '../lib/format';
import { ApproachPanel } from './approach-panel';
import { Leaderboard } from './leaderboard';

export const LegacyPanel = (): ReactElement => {
  const { loading, error, measurement, ranked, nested, reload } = useLegacyDashboard();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const users = ranked.length;

  return (
    <ApproachPanel
      approach="legacy"
      method="GET"
      endpoint={ENDPOINTS.legacy}
      summary={
        <>
          The problem: <code>SELECT *</code> with every relation, no pagination. The client
          downloads the whole graph, sums the scores and sorts it just to show {PAGE_SIZE} rows.
        </>
      }
      loading={loading}
      error={error}
      measurement={measurement}
      records={measurement === null ? null : users}
      recordsHint="users, each with its full graph"
      note={
        measurement !== null && (
          <>
            Also downloaded and thrown away: {formatCount(nested.enrollments)} enrollments (each
            with its course, instructor and modules), {formatCount(nested.modules)} module texts and{' '}
            {formatCount(nested.certificates)} certificates.
          </>
        )
      }
      onReload={reload}
      footer={
        visible < users && (
          <button
            type="button"
            className="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
          >
            Show {PAGE_SIZE} more{' '}
            <span className="button__hint">already in memory, no request</span>
          </button>
        )
      }
    >
      <Leaderboard rows={ranked.slice(0, visible)} busy={loading} />
    </ApproachPanel>
  );
};
