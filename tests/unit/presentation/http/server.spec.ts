import { EventEmitter } from 'node:events';
import type { Knex } from 'knex';
import { buildContainer } from '@infrastructure/config/container';
import { loadConfig } from '@infrastructure/config/env';
import { createLoggerMock } from '../../../support/fakes';
import { buildHttpApp, closeServer } from '@presentation/http/server';

describe('Http Server', () => {
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

  it('buildHttpApp boots Apollo and wires the Express app', async () => {
    const emitter = new EventEmitter();
    (emitter as any).raw = jest.fn();
    const fakeDb = emitter as unknown as Knex;
    const logger = createLoggerMock();

    const container = buildContainer(config, logger, { db: fakeDb });
    const httpApp = await buildHttpApp(container);

    expect(httpApp.app).toBeDefined();
    expect(httpApp.graphql).toBeDefined();
    expect(httpApp.compareResponseSizes).toBeDefined();

    await httpApp.graphql.stop();
  });

  it('closeServer gracefully closes HTTP server', async () => {
    const fakeServer = {
      close: jest.fn((cb) => cb()),
      closeIdleConnections: jest.fn(),
    };

    await closeServer(fakeServer as any);

    expect(fakeServer.close).toHaveBeenCalled();
    expect(fakeServer.closeIdleConnections).toHaveBeenCalled();
  });
});
