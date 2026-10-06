import { ConfigValidationError, loadConfig } from '@infrastructure/config/env';

describe('loadConfig', () => {
  const validEnv: NodeJS.ProcessEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: 'secretpassword',
    DB_NAME: 'dashboard_bff',
    CORS_ORIGINS: 'http://localhost:5173',
  };

  it('loads valid configuration with defaults', () => {
    const config = loadConfig(validEnv);

    expect(config.env).toBe('test');
    expect(config.http.port).toBe(3000);
    expect(config.database.host).toBe('localhost');
    expect(config.database.name).toBe('dashboard_bff');
    expect(config.database.pool.min).toBe(2);
    expect(config.database.pool.max).toBe(10);
    expect(config.dashboard.defaultPageSize).toBe(20);
    expect(config.graphql.playground).toBe(true);
  });

  it('throws ConfigValidationError on missing required database variables', () => {
    const incompleteEnv = { ...validEnv, DB_HOST: undefined };
    expect(() => loadConfig(incompleteEnv as any)).toThrow(ConfigValidationError);
  });

  it('rejects DB_POOL_MIN greater than DB_POOL_MAX', () => {
    const invalidEnv = { ...validEnv, DB_POOL_MIN: '20', DB_POOL_MAX: '5' };
    expect(() => loadConfig(invalidEnv as any)).toThrow(ConfigValidationError);
  });

  it('rejects DASHBOARD_PAGE_SIZE greater than DASHBOARD_MAX_PAGE_SIZE', () => {
    const invalidEnv = { ...validEnv, DASHBOARD_PAGE_SIZE: '200', DASHBOARD_MAX_PAGE_SIZE: '100' };
    expect(() => loadConfig(invalidEnv as any)).toThrow(ConfigValidationError);
  });
});
