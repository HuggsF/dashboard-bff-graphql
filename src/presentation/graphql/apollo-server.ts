import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import type { GraphQLFormattedError } from 'graphql';
import type { Logger } from '@application/interfaces/logger';
import type { GraphQLContext } from './context';
import { INTERNAL_SERVER_ERROR } from './errors';
import { buildResolvers } from './resolvers';
import type { ResolverDependencies } from './resolvers';
import { createDepthLimitRule } from './rules/depth-limit.rule';
import { typeDefs } from './schema';

export type ApolloServerOptions = ResolverDependencies & {
  readonly logger: Logger;
  /** Apollo Sandbox on GET /graphql + introspection (development only by default). */
  readonly playground: boolean;
  readonly maxDepth: number;
  readonly includeStacktrace: boolean;
};

const errorCode = (error: GraphQLFormattedError): unknown => error.extensions?.code;

export const formatGraphQLError = (
  formatted: GraphQLFormattedError,
  error: unknown,
  logger: Logger,
): GraphQLFormattedError => {
  if (errorCode(formatted) !== INTERNAL_SERVER_ERROR) {
    return formatted;
  }
  logger.error({ err: error, path: formatted.path }, 'GraphQL resolver failed');
  return {
    message: 'Internal server error',
    ...(formatted.path === undefined ? {} : { path: formatted.path }),
    extensions: { code: INTERNAL_SERVER_ERROR },
  };
};

export const createApolloServer = (options: ApolloServerOptions): ApolloServer<GraphQLContext> => {
  const { logger } = options;
  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers: buildResolvers(options),
    introspection: options.playground,
    validationRules: [createDepthLimitRule(options.maxDepth)],
    includeStacktraceInErrorResponses: options.includeStacktrace,
    // Signals are handled by our own graceful shutdown (HTTP server → Apollo → DB pool).
    stopOnTerminationSignals: false,
    plugins: [
      options.playground
        ? ApolloServerPluginLandingPageLocalDefault({ embed: true, footer: false })
        : ApolloServerPluginLandingPageDisabled(),
    ],
    logger: {
      debug: (message: string) => {
        logger.debug({ component: 'apollo' }, message);
      },
      info: (message: string) => {
        logger.info({ component: 'apollo' }, message);
      },
      warn: (message: string) => {
        logger.warn({ component: 'apollo' }, message);
      },
      error: (message: string) => {
        logger.error({ component: 'apollo' }, message);
      },
    },
    /** Internal errors are logged with their cause and masked for the client. */
    formatError: (formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError =>
      formatGraphQLError(formatted, error, logger),
  });
};
