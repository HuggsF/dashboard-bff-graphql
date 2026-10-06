import { createApolloServer, formatGraphQLError } from '@presentation/graphql/apollo-server';
import { INTERNAL_SERVER_ERROR } from '@presentation/graphql/errors';
import { createLoggerMock } from '../../../support/fakes';

describe('ApolloServer configuration', () => {
  it('creates Apollo Server with playground enabled and logger methods', () => {
    const logger = createLoggerMock();
    const server = createApolloServer({
      getDashboardGraphQL: { execute: jest.fn() },
      getUserProfile: { execute: jest.fn() },
      logger,
      playground: true,
      maxDepth: 8,
      includeStacktrace: true,
    });

    expect(server).toBeDefined();

    // Exercise Apollo logger callbacks
    const internalLogger = (server as any).logger;
    internalLogger.debug('test debug');
    internalLogger.info('test info');
    internalLogger.warn('test warn');
    internalLogger.error('test error');

    expect(logger.debug).toHaveBeenCalledWith({ component: 'apollo' }, 'test debug');
    expect(logger.info).toHaveBeenCalledWith({ component: 'apollo' }, 'test info');
    expect(logger.warn).toHaveBeenCalledWith({ component: 'apollo' }, 'test warn');
    expect(logger.error).toHaveBeenCalledWith({ component: 'apollo' }, 'test error');
  });

  it('formatError masks INTERNAL_SERVER_ERROR and preserves other codes', () => {
    const logger = createLoggerMock();

    // Test non-internal error
    const userInputError = {
      message: 'Bad input',
      extensions: { code: 'BAD_USER_INPUT' },
    };
    expect(formatGraphQLError(userInputError, new Error('bad'), logger)).toBe(userInputError);

    // Test internal error with path
    const internalErrorWithPath = {
      message: 'Secret DB failure',
      path: ['dashboard', 'edges'],
      extensions: { code: INTERNAL_SERVER_ERROR },
    };
    const formatted1 = formatGraphQLError(internalErrorWithPath, new Error('Secret DB failure'), logger);
    expect(formatted1).toEqual({
      message: 'Internal server error',
      path: ['dashboard', 'edges'],
      extensions: { code: INTERNAL_SERVER_ERROR },
    });
    expect(logger.error).toHaveBeenCalled();

    // Test internal error without path
    const internalErrorNoPath = {
      message: 'Fatal error',
      extensions: { code: INTERNAL_SERVER_ERROR },
    };
    const formatted2 = formatGraphQLError(internalErrorNoPath, new Error('Fatal error'), logger);
    expect(formatted2).toEqual({
      message: 'Internal server error',
      extensions: { code: INTERNAL_SERVER_ERROR },
    });
  });
});
