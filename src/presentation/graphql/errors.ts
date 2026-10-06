import { GraphQLError } from 'graphql';
import type { ApplicationError } from '@application/errors/application.error';
import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';

export const BAD_USER_INPUT = 'BAD_USER_INPUT';
export const INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR';

export const badUserInput = (message: string, argument: string): GraphQLError =>
  new GraphQLError(message, { extensions: { code: BAD_USER_INPUT, argument } });

/** Use-case failures → GraphQL errors. Unexpected failures keep their cause for logging only. */
export const toGraphQLError = (error: ApplicationError): GraphQLError => {
  if (error instanceof InvalidPaginationError) {
    return badUserInput(error.message, error.field);
  }
  return new GraphQLError('Internal server error', {
    originalError: error,
    extensions: { code: INTERNAL_SERVER_ERROR },
  });
};

/** A relation that must exist (non-null in the schema) is missing: a data integrity problem. */
export const missingNode = (type: string, id: string): GraphQLError =>
  new GraphQLError('Internal server error', {
    originalError: new Error(`${type} ${id} referenced but not found`),
    extensions: { code: INTERNAL_SERVER_ERROR },
  });
