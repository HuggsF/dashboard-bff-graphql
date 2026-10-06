import compression from 'compression';
import cors from 'cors';
import express from 'express';
import type { Express, RequestHandler } from 'express';
import type { Logger } from '@application/interfaces/logger';
import type { QueryCounter } from '@application/interfaces/query-counter';
import { BROTLI_OPTIONS, GZIP_OPTIONS } from '@infrastructure/compression/compression-options';
import type { CompareController } from '@presentation/http/controllers/compare.controller';
import type { DashboardController } from '@presentation/http/controllers/dashboard.controller';
import type { HealthController } from '@presentation/http/controllers/health.controller';
import { errorHandler } from '@presentation/http/middleware/error-handler.middleware';
import { notFoundHandler } from '@presentation/http/middleware/not-found.middleware';
import {
  QUERY_COUNT_HEADER,
  SERVER_TIMING_HEADER,
  queryMetrics,
} from '@presentation/http/middleware/query-metrics.middleware';
import { requestLogger } from '@presentation/http/middleware/request-logger.middleware';
import { buildDashboardRouter } from '@presentation/http/routes/dashboard.routes';
import { buildHealthRouter } from '@presentation/http/routes/health.routes';

export type HttpAppDependencies = {
  readonly logger: Logger;
  readonly queryCounter: QueryCounter;
  readonly healthController: HealthController;
  readonly dashboardController: DashboardController;
  readonly compareController: CompareController;
  /** Apollo Server mounted on /graphql. */
  readonly graphqlHandler: RequestHandler;
  readonly corsOrigins: readonly string[];
  /** Responses smaller than this are sent uncompressed (compressing 200 bytes costs more). */
  readonly compressionThresholdBytes: number;
};

export const createHttpApp = (dependencies: HttpAppDependencies): Express => {
  const app = express();
  app.disable('x-powered-by');

  // Content-Encoding negotiation: br > gzip > deflate > identity (Accept-Encoding).
  app.use(
    compression({
      threshold: dependencies.compressionThresholdBytes,
      level: GZIP_OPTIONS.level,
      brotli: BROTLI_OPTIONS,
    }),
  );
  app.use(
    cors({
      origin: [...dependencies.corsOrigins],
      exposedHeaders: [QUERY_COUNT_HEADER, SERVER_TIMING_HEADER, 'Content-Length'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(queryMetrics(dependencies.queryCounter));
  app.use(requestLogger(dependencies.logger));

  app.use(buildHealthRouter(dependencies.healthController));
  app.use(
    '/api',
    buildDashboardRouter(dependencies.dashboardController, dependencies.compareController),
  );
  app.use('/graphql', dependencies.graphqlHandler);

  app.use(notFoundHandler);
  app.use(errorHandler(dependencies.logger));
  return app;
};
