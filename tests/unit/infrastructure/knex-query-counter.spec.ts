import { EventEmitter } from 'node:events';
import type { Knex } from 'knex';
import { KnexQueryCounter } from '@infrastructure/database/knex-query-counter';

describe('KnexQueryCounter', () => {
  it('counts queries executed inside an operation scope', () => {
    const emitter = new EventEmitter();
    const fakeDb = emitter as unknown as Knex;
    const counter = new KnexQueryCounter(fakeDb);

    // Query outside scope should be ignored
    emitter.emit('query', {});

    const queriesInScope = counter.run((scope) => {
      emitter.emit('query', {});
      emitter.emit('query', {});
      return scope.queries;
    });

    expect(queriesInScope).toBe(2);

    counter.dispose();
  });

  it('supports synchronous operations in scope', () => {
    const emitter = new EventEmitter();
    const fakeDb = emitter as unknown as Knex;
    const counter = new KnexQueryCounter(fakeDb);

    const result = counter.run((scope) => {
      emitter.emit('query', {});
      return scope.queries;
    });

    expect(result).toBe(1);
    counter.dispose();
  });

  it('correctly aggregates queries in nested scopes', () => {
    const emitter = new EventEmitter();
    const fakeDb = emitter as unknown as Knex;
    const counter = new KnexQueryCounter(fakeDb);

    counter.run((outerScope) => {
      emitter.emit('query', {});
      counter.run((innerScope) => {
        emitter.emit('query', {});
        expect(innerScope.queries).toBe(1);
      });
      expect(outerScope.queries).toBe(2);
    });

    counter.dispose();
  });

  it('supports async operations in scope', async () => {
    const emitter = new EventEmitter();
    const fakeDb = emitter as unknown as Knex;
    const counter = new KnexQueryCounter(fakeDb);

    const queries = await counter.run(async (scope) => {
      await Promise.resolve();
      emitter.emit('query', {});
      return scope.queries;
    });

    expect(queries).toBe(1);
    counter.dispose();
  });
});
