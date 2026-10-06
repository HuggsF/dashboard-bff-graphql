import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';
import { createMeasuringFetch, parseJson } from './measure';
import type { Measurement } from './measure';
import type { ApproachResult } from './types';

type Listener = () => void;

/** Tiny external store: the GraphQL tab subscribes to the measurement of the latest call. */
let latest: ApproachResult | null = null;
const listeners = new Set<Listener>();

export const graphqlMeasurements = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): ApproachResult | null {
    return latest;
  },
};

const countEdges = (body: ArrayBuffer): number => {
  try {
    const json = parseJson(body) as { data?: { dashboard?: { edges?: unknown[] } } };
    return json.data?.dashboard?.edges?.length ?? 0;
  } catch {
    return 0;
  }
};

const record = (measurement: Measurement, body: ArrayBuffer): void => {
  latest = { measurement, records: countEdges(body) };
  listeners.forEach((listener) => listener());
};

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: '/graphql', fetch: createMeasuringFetch(record) }),
  cache: new InMemoryCache({
    typePolicies: {
      // Cursor pagination: "Load more" appends the next edges to the same list.
      Query: { fields: { dashboard: relayStylePagination() } },
    },
  }),
});
