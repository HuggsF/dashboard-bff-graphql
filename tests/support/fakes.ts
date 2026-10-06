import type { BatchFunction, BatchLoader, BatchLoaderFactory } from '@application/interfaces/batch-loader';
import type { Clock } from '@application/interfaces/clock';
import type { LogContext, Logger } from '@application/interfaces/logger';
import type { PayloadCompressor, PayloadSizes } from '@application/interfaces/payload-compressor';
import type { PerformanceMonitor } from '@application/interfaces/performance-monitor';
import type { QueryCounter, QueryScope } from '@application/interfaces/query-counter';

type LogFn = Logger['info'];
type LogMock = jest.Mock<ReturnType<LogFn>, Parameters<LogFn>>;

export type LoggerMock = { [K in keyof Logger]: LogMock };

const logMock = (): LogMock => jest.fn<ReturnType<LogFn>, [LogContext, string]>();

export const createLoggerMock = (): LoggerMock => ({
  debug: logMock(),
  info: logMock(),
  warn: logMock(),
  error: logMock(),
});

/** Every call advances the clock by `stepMs`, or replays the given readings. */
export class FakePerformanceMonitor implements PerformanceMonitor {
  private calls = 0;

  constructor(private readonly readings: readonly number[] = []) {}

  nowMs(): number {
    const reading = this.readings[this.calls] ?? this.calls * 10;
    this.calls += 1;
    return reading;
  }
}

export class FixedClock implements Clock {
  constructor(private readonly current = new Date('2026-01-01T12:00:00.000Z')) {}

  now(): Date {
    return this.current;
  }
}

/** Query counter driven by the test: `record()` simulates one SQL statement in the current scope. */
export class FakeQueryCounter implements QueryCounter {
  private readonly scopes: { queries: number }[] = [];

  run<T>(operation: (scope: QueryScope) => T): T {
    const state = { queries: 0 };
    this.scopes.push(state);
    const scope: QueryScope = {
      get queries(): number {
        return state.queries;
      },
    };
    const result = operation(scope);
    if (result instanceof Promise) {
      return result.finally(() => this.scopes.pop()) as T;
    }
    this.scopes.pop();
    return result;
  }

  record(count = 1): void {
    for (const scope of this.scopes) {
      scope.queries += count;
    }
  }
}

/** Sizes proportional to the body length, so ratios are easy to assert. */
export class FakePayloadCompressor implements PayloadCompressor {
  measure(body: string): Promise<PayloadSizes> {
    const raw = Buffer.byteLength(body);
    return Promise.resolve({ raw, gzip: Math.ceil(raw / 4), brotli: Math.ceil(raw / 5) });
  }
}

/**
 * Minimal DataLoader stand-in: keys requested in the same microtask are coalesced into one batch
 * call, and every batch call is recorded so tests can assert how lookups were grouped.
 */
export class RecordingBatchLoaderFactory implements BatchLoaderFactory {
  readonly calls: { name: string; keys: unknown[] }[] = [];

  create<K, V>(name: string, batch: BatchFunction<K, V>): BatchLoader<K, V> {
    let pending: { key: K; resolve: (value: V) => void; reject: (error: unknown) => void }[] = [];
    const flush = async (): Promise<void> => {
      const queue = pending;
      pending = [];
      const keys = queue.map((entry) => entry.key);
      this.calls.push({ name, keys });
      try {
        const values = await batch(keys);
        queue.forEach((entry, index) => {
          const value = values[index];
          if (value instanceof Error) {
            entry.reject(value);
          } else {
            entry.resolve(value as V);
          }
        });
      } catch (error: unknown) {
        queue.forEach((entry) => {
          entry.reject(error);
        });
      }
    };
    return {
      load: (key: K): Promise<V> =>
        new Promise<V>((resolve, reject) => {
          if (pending.length === 0) {
            queueMicrotask(() => void flush());
          }
          pending.push({ key, resolve, reject });
        }),
    };
  }
}
