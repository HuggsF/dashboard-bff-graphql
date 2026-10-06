import { useMemo, useState } from 'react';
import { ENDPOINTS, rankLegacyUsers } from '../lib/api';
import type { LeaderboardRow, LegacyDashboardResponse } from '../lib/api';
import type { Measurement } from '../lib/measure';
import { useMeasuredJson } from './use-measured-json';

export type LegacyDashboard = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly measurement: Measurement | null;
  /** Every user, ranked on the client. */
  readonly ranked: readonly LeaderboardRow[];
  /** Nested objects that came along: enrollments (each with course, instructor, modules) + certificates. */
  readonly nested: {
    readonly enrollments: number;
    readonly modules: number;
    readonly certificates: number;
  };
  readonly reload: () => void;
};

export const useLegacyDashboard = (): LegacyDashboard => {
  const [reloadKey, setReloadKey] = useState(0);
  const { loading, error, data, measurement } = useMeasuredJson<LegacyDashboardResponse>(
    ENDPOINTS.legacy,
    reloadKey,
  );

  const ranked = useMemo(() => (data === null ? [] : rankLegacyUsers(data.users)), [data]);

  const nested = useMemo(() => {
    const counts = { enrollments: 0, modules: 0, certificates: 0 };
    for (const user of data?.users ?? []) {
      counts.enrollments += user.enrollments.length;
      counts.certificates += user.certificates.length;
      for (const enrollment of user.enrollments) counts.modules += enrollment.course.modules.length;
    }
    return counts;
  }, [data]);

  return {
    loading,
    error,
    measurement,
    ranked,
    nested,
    reload: () => setReloadKey((key) => key + 1),
  };
};
