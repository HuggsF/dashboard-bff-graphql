import type { Server } from 'node:http';
import type { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import type { Express } from 'express';
import type { CompareResponseSizesUseCase } from '@application/use-cases/compare-response-sizes.use-case';
import type { Container } from '@infrastructure/config/container';
import { createPayloadSources } from '@presentation/compare/payload-sources';
import { createApolloServer } from '@presentation/graphql/apollo-server';
import type { GraphQLContext } from '@presentation/graphql/context';
import { createHttpApp } from '@presentation/http/app';
import { CompareController } from '@presentation/http/controllers/compare.controller';
import { DashboardController } from '@presentation/http/controllers/dashboard.controller';
import { HealthController } from '@presentation/http/controllers/health.controller';

export type HttpApplication = {
  readonly app: Express;
  /** Started Apollo Server — stop it on shutdown. */
  readonly graphql: ApolloServer<GraphQLContext>;
  readonly compareResponseSizes: CompareResponseSizesUseCase;
};

/** Wires controllers, Apollo Server and the compare payload sources to the container. */
export const buildHttpApp = async (container: Container): Promise<HttpApplication> => {
  const { config } = container;
  const graphql = createApolloServer({
    getDashboardGraphQL: container.getDashboardGraphQL,
    getUserProfile: container.getUserProfile,
    logger: container.logger,
    playground: config.graphql.playground,
    maxDepth: config.graphql.maxDepth,
    includeStacktrace: config.env === 'development',
  });
  await graphql.start();

  const createContext = (): GraphQLContext => ({ loaders: container.createGraphLoaders() });
  const compareResponseSizes = container.createCompareResponseSizes(
    createPayloadSources({
      getDashboardLegacy: container.getDashboardLegacy,
      getDashboardBFF: container.getDashboardBFF,
      graphql,
      createContext,
      pageSize: config.dashboard.defaultPageSize,
    }),
  );

  const app = createHttpApp({
    logger: container.logger,
    queryCounter: container.queryCounter,
    healthController: new HealthController(container.checkHealth),
    dashboardController: new DashboardController(
      container.getDashboardLegacy,
      container.getDashboardBFF,
    ),
    compareController: new CompareController(compareResponseSizes),
    graphqlHandler: expressMiddleware(graphql, {
      context: () => Promise.resolve(createContext()),
    }),
    corsOrigins: config.http.corsOrigins,
    compressionThresholdBytes: config.http.compressionThresholdBytes,
  });
  return { app, graphql, compareResponseSizes };
};

export const listen = (app: Express, port: number): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(server);
    });
  });

/** Stops accepting connections and resolves once in-flight requests are done. */
export const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
    server.closeIdleConnections();
  });
