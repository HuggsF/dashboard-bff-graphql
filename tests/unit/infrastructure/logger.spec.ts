import { createLogger } from '@infrastructure/logging/logger';

describe('createLogger', () => {
  it('creates a standard pino logger', () => {
    const logger = createLogger({ level: 'info', pretty: false });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('creates a pretty logger when pretty is true', () => {
    const logger = createLogger({ level: 'debug', pretty: true, name: 'test-logger' });
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
  });
});
