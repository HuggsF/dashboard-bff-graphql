import { HeaderMap } from '@apollo/server';
import type { ApolloServer } from '@apollo/server';
import type { PayloadSource } from '@application/interfaces/payload-source';
import type { GetDashboardBFFUseCase } from '@application/use-cases/get-dashboard-bff.use-case';
import type { GetDashboardLegacyUseCase } from '@application/use-cases/get-dashboard-legacy.use-case';
import type { GraphQLContext } from '@presentation/graphql/context';

/** The query the React dashboard sends: the 3 rendered fields + id (list key) + paging info. */
export const DASHBOARD_GRAPHQL_QUERY =
  'query Dashboard($pageSize: Int, $after: String) { dashboard(pageSize: $pageSize, after: $after) ' +
  '{ edges { node { id name totalScore avatarUrl } } pageInfo { hasNextPage endCursor } } }';

export type PayloadSourceDependencies = {
  readonly getDashboardLegacy: Pick<GetDashboardLegacyUseCase, 'execute'>;
  readonly getDashboardBFF: Pick<GetDashboardBFFUseCase, 'execute'>;
  readonly graphql: Pick<ApolloServer<GraphQLContext>, 'executeHTTPGraphQLRequest'>;
  readonly createContext: () => GraphQLContext;
  readonly pageSize: number;
};

type GraphQLDashboardBody = {
  readonly data?: { readonly dashboard?: { readonly edges?: readonly unknown[] } } | null;
  readonly errors?: readonly { readonly message: string }[];
};

/**
 * Produces each payload exactly as the HTTP layer would send it: `res.json()` is a plain
 * `JSON.stringify`, and the GraphQL body comes from Apollo's own HTTP pipeline.
 */
export const createPayloadSources = (deps: PayloadSourceDependencies): PayloadSource[] => [
  {
    id: 'v1-legacy',
    label: 'REST Legacy (v1)',
    request: 'GET /api/v1/dashboard',
    load: async () => {
      const result = await deps.getDashboardLegacy.execute();
      if (!result.success) {
        throw result.error;
      }
      return { body: JSON.stringify(result.data), records: result.data.users.length };
    },
  },
  {
    id: 'v2-bff',
    label: 'REST BFF (v2)',
    request: `GET /api/v2/dashboard?page=1&size=${deps.pageSize}`,
    load: async () => {
      const result = await deps.getDashboardBFF.execute({ page: 1, size: deps.pageSize });
      if (!result.success) {
        throw result.error;
      }
      return { body: JSON.stringify(result.data), records: result.data.data.length };
    },
  },
  {
    id: 'v3-graphql',
    label: 'GraphQL (v3)',
    request: `POST /graphql ${DASHBOARD_GRAPHQL_QUERY}`,
    load: async () => {
      const response = await deps.graphql.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          method: 'POST',
          headers: new HeaderMap([['content-type', 'application/json']]),
          search: '',
          body: { query: DASHBOARD_GRAPHQL_QUERY, variables: { pageSize: deps.pageSize } },
        },
        context: () => Promise.resolve(deps.createContext()),
      });
      if (response.body.kind !== 'complete') {
        throw new Error('Unexpected incremental GraphQL response');
      }
      const body = response.body.string;
      const parsed = JSON.parse(body) as GraphQLDashboardBody;
      if (parsed.errors !== undefined && parsed.errors.length > 0) {
        throw new Error(
          `GraphQL errors: ${parsed.errors.map((error) => error.message).join('; ')}`,
        );
      }
      return { body, records: parsed.data?.dashboard?.edges?.length ?? 0 };
    },
  },
];
