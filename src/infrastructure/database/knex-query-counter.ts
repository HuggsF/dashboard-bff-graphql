import { AsyncLocalStorage } from 'node:async_hooks';
import type { Knex } from 'knex';
import type { QueryCounter, QueryScope } from '@application/interfaces/query-counter';

type ScopeState = { queries: number; readonly parent: ScopeState | null };

/**
 * Counts SQL statements per logical operation. knex emits a `query` event for every statement;
 * AsyncLocalStorage tells us which operation (HTTP request, compare run…) issued it, so counts
 * stay exact under concurrency. Statements issued outside any scope are ignored.
 */
export class KnexQueryCounter implements QueryCounter {
  private readonly storage = new AsyncLocalStorage<ScopeState>();

  private readonly onQuery = (): void => {
    let state: ScopeState | null = this.storage.getStore() ?? null;
    while (state !== null) {
      state.queries += 1;
      state = state.parent;
    }
  };

  constructor(private readonly db: Knex) {
    db.on('query', this.onQuery);
  }

  run<T>(operation: (scope: QueryScope) => T): T {
    const state: ScopeState = { queries: 0, parent: this.storage.getStore() ?? null };
    const scope: QueryScope = {
      get queries(): number {
        return state.queries;
      },
    };
    return this.storage.run(state, () => operation(scope));
  }

  /** Detaches the listener (tests that reuse a pool). */
  dispose(): void {
    this.db.removeListener('query', this.onQuery);
  }
}
