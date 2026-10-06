import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const port = z.coerce.number().int().min(1).max(65_535);

const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .pipe(z.array(z.string().url()));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: port.default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    LOG_PRETTY: booleanFlag.default('false'),

    DB_HOST: z.string().min(1),
    DB_PORT: port,
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string().min(1),
    DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
    DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
    DB_MIGRATE_ON_START: booleanFlag.default('false'),

    CORS_ORIGINS: originList.default('http://localhost:5173'),
    COMPRESSION_THRESHOLD_BYTES: z.coerce.number().int().min(0).default(1024),

    /** Apollo Sandbox + introspection. Defaults to on, except in production. */
    GRAPHQL_PLAYGROUND: booleanFlag.optional(),
    GRAPHQL_MAX_DEPTH: z.coerce.number().int().min(2).max(20).default(8),

    DASHBOARD_PAGE_SIZE: z.coerce.number().int().min(1).default(20),
    DASHBOARD_MAX_PAGE_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
    COMPARE_MAX_RUNS: z.coerce.number().int().min(1).max(50).default(10),

    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  })
  .refine((env) => env.DB_POOL_MIN <= env.DB_POOL_MAX, {
    message: 'DB_POOL_MIN must be less than or equal to DB_POOL_MAX',
    path: ['DB_POOL_MIN'],
  })
  .refine((env) => env.DASHBOARD_PAGE_SIZE <= env.DASHBOARD_MAX_PAGE_SIZE, {
    message: 'DASHBOARD_PAGE_SIZE must be less than or equal to DASHBOARD_MAX_PAGE_SIZE',
    path: ['DASHBOARD_PAGE_SIZE'],
  });

export type LogLevel = z.infer<typeof envSchema>['LOG_LEVEL'];

export type DatabaseConfig = {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly name: string;
  readonly pool: { readonly min: number; readonly max: number };
  readonly migrateOnStart: boolean;
};

export type AppConfig = {
  readonly env: 'development' | 'test' | 'production';
  readonly http: {
    readonly port: number;
    readonly corsOrigins: readonly string[];
    readonly compressionThresholdBytes: number;
  };
  readonly log: { readonly level: LogLevel; readonly pretty: boolean };
  readonly database: DatabaseConfig;
  readonly graphql: { readonly playground: boolean; readonly maxDepth: number };
  readonly dashboard: { readonly defaultPageSize: number; readonly maxPageSize: number };
  readonly compare: { readonly maxRuns: number };
  readonly shutdownTimeoutMs: number;
};

export class ConfigValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigValidationError';
  }
}

/** Loads `.env` (if present) into process.env without overriding variables already set. */
export const loadEnvFile = (path?: string): void => {
  loadDotenv({ path, quiet: true });
};

/** Validates the environment once at startup: the app refuses to boot with a bad configuration. */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigValidationError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const vars = parsed.data;

  return {
    env: vars.NODE_ENV,
    http: {
      port: vars.PORT,
      corsOrigins: vars.CORS_ORIGINS,
      compressionThresholdBytes: vars.COMPRESSION_THRESHOLD_BYTES,
    },
    log: { level: vars.LOG_LEVEL, pretty: vars.LOG_PRETTY },
    database: {
      host: vars.DB_HOST,
      port: vars.DB_PORT,
      user: vars.DB_USER,
      password: vars.DB_PASSWORD,
      name: vars.DB_NAME,
      pool: { min: vars.DB_POOL_MIN, max: vars.DB_POOL_MAX },
      migrateOnStart: vars.DB_MIGRATE_ON_START,
    },
    graphql: {
      playground: vars.GRAPHQL_PLAYGROUND ?? vars.NODE_ENV !== 'production',
      maxDepth: vars.GRAPHQL_MAX_DEPTH,
    },
    dashboard: {
      defaultPageSize: vars.DASHBOARD_PAGE_SIZE,
      maxPageSize: vars.DASHBOARD_MAX_PAGE_SIZE,
    },
    compare: { maxRuns: vars.COMPARE_MAX_RUNS },
    shutdownTimeoutMs: vars.SHUTDOWN_TIMEOUT_MS,
  };
};
