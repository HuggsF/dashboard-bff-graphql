import type { Knex } from 'knex';
import type { BatchLoaderFactory } from '@application/interfaces/batch-loader';
import type { Clock } from '@application/interfaces/clock';
import type { Logger } from '@application/interfaces/logger';
import type { PayloadCompressor } from '@application/interfaces/payload-compressor';
import type { PayloadSource } from '@application/interfaces/payload-source';
import type { PerformanceMonitor } from '@application/interfaces/performance-monitor';
import { createLearningGraphLoaders } from '@application/services/learning-graph.loaders';
import type { LearningGraphLoaders } from '@application/services/learning-graph.loaders';
import type { PaginationPolicy } from '@application/services/pagination-policy';
import { CheckHealthUseCase } from '@application/use-cases/check-health.use-case';
import { CompareResponseSizesUseCase } from '@application/use-cases/compare-response-sizes.use-case';
import { GetDashboardBFFUseCase } from '@application/use-cases/get-dashboard-bff.use-case';
import { GetDashboardGraphQLUseCase } from '@application/use-cases/get-dashboard-graphql.use-case';
import { GetDashboardLegacyUseCase } from '@application/use-cases/get-dashboard-legacy.use-case';
import { GetUserProfileUseCase } from '@application/use-cases/get-user-profile.use-case';
import { DataLoaderBatchLoaderFactory } from '@infrastructure/batching/dataloader-batch-loader.factory';
import { ZlibPayloadCompressor } from '@infrastructure/compression/zlib-payload-compressor';
import type { AppConfig } from '@infrastructure/config/env';
import { KnexQueryCounter } from '@infrastructure/database/knex-query-counter';
import { createDatabase, pingDatabase } from '@infrastructure/database/knex';
import { MySqlDashboardRepository } from '@infrastructure/database/mysql-dashboard.repository';
import { MySqlLearningGraphReader } from '@infrastructure/database/mysql-learning-graph.reader';
import { MySqlUserRepository } from '@infrastructure/database/mysql-user.repository';
import { ProcessPerformanceMonitor } from '@infrastructure/system/process-performance-monitor';
import { SystemClock } from '@infrastructure/system/system-clock';

export type Container = {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly db: Knex;
  readonly queryCounter: KnexQueryCounter;
  readonly compressor: PayloadCompressor;
  readonly clock: Clock;
  readonly performanceMonitor: PerformanceMonitor;
  readonly userRepository: MySqlUserRepository;
  readonly dashboardRepository: MySqlDashboardRepository;
  readonly getDashboardLegacy: GetDashboardLegacyUseCase;
  readonly getDashboardBFF: GetDashboardBFFUseCase;
  readonly getDashboardGraphQL: GetDashboardGraphQLUseCase;
  readonly getUserProfile: GetUserProfileUseCase;
  readonly checkHealth: CheckHealthUseCase;
  /** Fresh DataLoaders for ONE GraphQL request (their cache must never be shared). */
  readonly createGraphLoaders: () => LearningGraphLoaders;
  /** The compare use case measures the presentation-level payload sources it is given. */
  readonly createCompareResponseSizes: (
    sources: readonly PayloadSource[],
  ) => CompareResponseSizesUseCase;
};

export type ContainerOverrides = {
  /** Reuse an existing pool (tests). */
  readonly db?: Knex;
  /** Swap the DataLoader strategy (tests compare batched vs naive resolution). */
  readonly batchLoaderFactory?: BatchLoaderFactory;
};

/** Composition root: the only place where concrete adapters are wired to the use cases. */
export const buildContainer = (
  config: AppConfig,
  logger: Logger,
  overrides: ContainerOverrides = {},
): Container => {
  const db = overrides.db ?? createDatabase(config.database);
  const queryCounter = new KnexQueryCounter(db);
  const compressor = new ZlibPayloadCompressor();
  const clock = new SystemClock();
  const performanceMonitor = new ProcessPerformanceMonitor();
  const userRepository = new MySqlUserRepository(db);
  const dashboardRepository = new MySqlDashboardRepository(db);
  const graphReader = new MySqlLearningGraphReader(db);
  const batchLoaderFactory = overrides.batchLoaderFactory ?? new DataLoaderBatchLoaderFactory();
  const pagination: PaginationPolicy = {
    defaultPageSize: config.dashboard.defaultPageSize,
    maxPageSize: config.dashboard.maxPageSize,
  };

  return {
    config,
    logger,
    db,
    queryCounter,
    compressor,
    clock,
    performanceMonitor,
    userRepository,
    dashboardRepository,
    getDashboardLegacy: new GetDashboardLegacyUseCase(userRepository),
    getDashboardBFF: new GetDashboardBFFUseCase(dashboardRepository, userRepository, pagination),
    getDashboardGraphQL: new GetDashboardGraphQLUseCase(
      dashboardRepository,
      userRepository,
      pagination,
    ),
    getUserProfile: new GetUserProfileUseCase(userRepository),
    checkHealth: new CheckHealthUseCase(
      [{ name: 'database', check: () => pingDatabase(db) }],
      performanceMonitor,
    ),
    createGraphLoaders: () => createLearningGraphLoaders(graphReader, batchLoaderFactory),
    createCompareResponseSizes: (sources) =>
      new CompareResponseSizesUseCase(
        sources,
        compressor,
        queryCounter,
        performanceMonitor,
        clock,
        { maxRuns: config.compare.maxRuns },
      ),
  };
};
