import { apolloClient, graphqlMeasurements } from './apollo';
import { DASHBOARD_QUERY, ENDPOINTS, PAGE_SIZE } from './api';
import type { BffDashboardResponse, LegacyDashboardResponse } from './api';
import { measuredFetch, parseJson } from './measure';
import type { Measurement } from './measure';
import type { Approach, ApproachResult, ResultsByApproach } from './types';

/** Runs per approach: sizes are identical every run, the median smooths out the timing noise. */
export const COMPARISON_RUNS = 3;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const fetchRest = async (
  url: string,
  countRecords: (json: unknown) => number,
): Promise<ApproachResult> => {
  const { response, measurement, body } = await measuredFetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
  return { measurement, records: countRecords(parseJson(body)) };
};

/** Same client path as the GraphQL tab (Apollo + __typename), without touching its cache. */
const fetchGraphql = async (): Promise<ApproachResult> => {
  await apolloClient.query({
    query: DASHBOARD_QUERY,
    variables: { pageSize: PAGE_SIZE },
    fetchPolicy: 'no-cache',
  });
  const result = graphqlMeasurements.getSnapshot();
  if (result === null) throw new Error('GraphQL call was not measured');
  return result;
};

const repeat = async (call: () => Promise<ApproachResult>): Promise<ApproachResult> => {
  const runs: ApproachResult[] = [];
  for (let run = 0; run < COMPARISON_RUNS; run += 1) {
    runs.push(await call()); // sequential on purpose: concurrent calls would share bandwidth
  }
  const last = runs[runs.length - 1];
  if (last === undefined) throw new Error('No runs');
  const measurement: Measurement = {
    ...last.measurement,
    durationMs: median(runs.map((result) => result.measurement.durationMs)),
  };
  return { ...last, measurement };
};

/** First page of each approach, one approach at a time. */
export const compareApproaches = async (
  onProgress: (approach: Approach) => void,
): Promise<ResultsByApproach> => {
  onProgress('legacy');
  const legacy = await repeat(() =>
    fetchRest(ENDPOINTS.legacy, (json) => (json as LegacyDashboardResponse).users.length),
  );
  onProgress('bff');
  const bff = await repeat(() =>
    fetchRest(ENDPOINTS.bff(1), (json) => (json as BffDashboardResponse).data.length),
  );
  onProgress('graphql');
  const graphql = await repeat(fetchGraphql);
  return { legacy, bff, graphql };
};
