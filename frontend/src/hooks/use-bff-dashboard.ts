import { useState } from 'react';
import { ENDPOINTS } from '../lib/api';
import type { BffDashboardResponse } from '../lib/api';
import type { Measurement } from '../lib/measure';
import { useMeasuredJson } from './use-measured-json';

export type BffDashboard = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly measurement: Measurement | null;
  readonly data: BffDashboardResponse | null;
  readonly page: number;
  readonly goTo: (page: number) => void;
  readonly reload: () => void;
};

/** Offset pagination: each page is its own request (page/size query string). */
export const useBffDashboard = (): BffDashboard => {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const { loading, error, data, measurement } = useMeasuredJson<BffDashboardResponse>(
    ENDPOINTS.bff(page),
    reloadKey,
  );

  return {
    loading,
    error,
    measurement,
    data,
    page,
    goTo: (next) => setPage(Math.max(1, next)),
    reload: () => setReloadKey((key) => key + 1),
  };
};
