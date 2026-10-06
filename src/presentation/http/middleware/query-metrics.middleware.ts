import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';
import onHeaders from 'on-headers';
import type { QueryCounter } from '@application/interfaces/query-counter';

export const QUERY_COUNT_HEADER = 'X-DB-Query-Count';
export const SERVER_TIMING_HEADER = 'Server-Timing';

/**
 * Runs each request inside its own query-counting scope and reports, on every response:
 *   X-DB-Query-Count: 6
 *   Server-Timing: db;desc="6 SQL queries", app;dur=412.7
 * (Server-Timing is shown by browser DevTools; the frontend reads both headers.)
 *
 * Must be registered AFTER the body parsers: their stream callbacks do not run in this scope.
 */
export const queryMetrics =
  (counter: QueryCounter) =>
  (_request: Request, response: Response, next: NextFunction): void => {
    const startedAt = performance.now();
    counter.run((scope) => {
      onHeaders(response, () => {
        const durationMs = (performance.now() - startedAt).toFixed(1);
        response.setHeader(QUERY_COUNT_HEADER, String(scope.queries));
        response.setHeader(
          SERVER_TIMING_HEADER,
          `db;desc="${scope.queries} SQL queries", app;dur=${durationMs}`,
        );
      });
      next();
    });
  };
