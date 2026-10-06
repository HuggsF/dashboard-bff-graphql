export type QueryScope = {
  /** SQL statements sent to the database so far by the operation running in this scope. */
  readonly queries: number;
};

/**
 * Counts the database round-trips caused by one operation - and only by it, even when other
 * requests run concurrently (implemented with AsyncLocalStorage). Nested scopes also count
 * toward their parent scope.
 */
export interface QueryCounter {
  run<T>(operation: (scope: QueryScope) => T): T;
}
