import { InvalidPaginationError } from '@application/errors/invalid-pagination.error';
import { UnexpectedError } from '@application/errors/unexpected.error';
import {
  BAD_USER_INPUT,
  INTERNAL_SERVER_ERROR,
  badUserInput,
  missingNode,
  toGraphQLError,
} from '@presentation/graphql/errors';

describe('GraphQL Errors', () => {
  it('badUserInput creates error with BAD_USER_INPUT code and argument extension', () => {
    const error = badUserInput('Invalid page', 'page');
    expect(error.message).toBe('Invalid page');
    expect(error.extensions.code).toBe(BAD_USER_INPUT);
    expect(error.extensions.argument).toBe('page');
  });

  it('toGraphQLError maps InvalidPaginationError to badUserInput', () => {
    const error = toGraphQLError(new InvalidPaginationError('size', 'size must be > 0'));
    expect(error.extensions.code).toBe(BAD_USER_INPUT);
    expect(error.extensions.argument).toBe('size');
  });

  it('toGraphQLError maps UnexpectedError to INTERNAL_SERVER_ERROR', () => {
    const error = toGraphQLError(new UnexpectedError('doing work', new Error('DB boom')));
    expect(error.message).toBe('Internal server error');
    expect(error.extensions.code).toBe(INTERNAL_SERVER_ERROR);
  });

  it('missingNode creates INTERNAL_SERVER_ERROR referencing node type and id', () => {
    const error = missingNode('Course', 'c-123');
    expect(error.message).toBe('Internal server error');
    expect(error.extensions.code).toBe(INTERNAL_SERVER_ERROR);
  });
});
