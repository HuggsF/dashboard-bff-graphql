import { EventEmitter } from 'node:events';
import type { Knex } from 'knex';
import { buildContainer } from '@infrastructure/config/container';
import { loadConfig } from '@infrastructure/config/env';
import { createLoggerMock } from '../../support/fakes';

describe('Container', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: 'secret',
    DB_NAME: 'test_db',
    CORS_ORIGINS: 'http://localhost:5173',
  });

  it('builds the container with all use cases and adapters wired', () => {
    const emitter = new EventEmitter();
    (emitter as any).raw = jest.fn();
    const fakeDb = emitter as unknown as Knex;
    const logger = createLoggerMock();

    const container = buildContainer(config, logger, { db: fakeDb });

    expect(container.config).toBe(config);
    expect(container.db).toBe(fakeDb);
    expect(container.getDashboardLegacy).toBeDefined();
    expect(container.getDashboardBFF).toBeDefined();
    expect(container.getDashboardGraphQL).toBeDefined();
    expect(container.getUserProfile).toBeDefined();
    expect(container.checkHealth).toBeDefined();

    const loaders = container.createGraphLoaders();
    expect(loaders.courseById).toBeDefined();
    expect(loaders.enrollmentsByUserId).toBeDefined();

    const compareUseCase = container.createCompareResponseSizes([]);
    expect(compareUseCase).toBeDefined();
  });
});
