import './module-aliases';
import { buildContainer } from '@infrastructure/config/container';
import { loadConfig, loadEnvFile } from '@infrastructure/config/env';
import { migrateLatest } from '@infrastructure/database/migrator';
import { registerGracefulShutdown } from '@infrastructure/lifecycle/graceful-shutdown';
import { createLogger } from '@infrastructure/logging/logger';
import { buildHttpApp, closeServer, listen } from '@presentation/http/server';

/** HTTP entry point: /api/v1/dashboard, /api/v2/dashboard, /api/compare, /graphql, /health. */
const main = async (): Promise<void> => {
  loadEnvFile();
  const config = loadConfig();
  const logger = createLogger(config.log);
  const container = buildContainer(config, logger);

  if (config.database.migrateOnStart) {
    const applied = await migrateLatest(container.db);
    logger.info({ applied }, 'Database migrations applied');
  }

  const { app, graphql } = await buildHttpApp(container);
  const server = await listen(app, config.http.port);
  logger.info(
    { port: config.http.port, env: config.env, graphqlSandbox: config.graphql.playground },
    'HTTP server listening',
  );

  registerGracefulShutdown({
    logger,
    timeoutMs: config.shutdownTimeoutMs,
    tasks: [
      { name: 'http-server', close: () => closeServer(server) },
      { name: 'apollo-server', close: () => graphql.stop() },
      { name: 'database', close: () => container.db.destroy() },
    ],
  });
};

main().catch((error: unknown) => {
  process.stderr.write(`Fatal: failed to start the server\n${String(error)}\n`);
  process.exit(1);
});
