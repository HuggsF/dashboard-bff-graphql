import type { DashboardPosition } from '@domain/repositories/dashboard.repository';

/** Versioned prefix: the cursor format can evolve without breaking clients that hold old ones. */
const PREFIX = 'dashboard:v1:';
const SCORE_PATTERN = /^\d{1,7}$/;
const ID_PATTERN = /^[A-Za-z0-9-]{1,36}$/;

/**
 * Cursors are OPAQUE to clients (base64url of `dashboard:v1:<totalScore>:<id>`): they must only
 * be passed back, never built or parsed, so the keyset behind them can change freely.
 */
export const encodeCursor = (position: DashboardPosition): string =>
  Buffer.from(`${PREFIX}${position.totalScore}:${position.id}`, 'utf8').toString('base64url');

/** Returns `null` for anything that is not a cursor issued by `encodeCursor`. */
export const decodeCursor = (cursor: string): DashboardPosition | null => {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  if (!decoded.startsWith(PREFIX)) {
    return null;
  }
  const payload = decoded.slice(PREFIX.length);
  const separator = payload.indexOf(':');
  const score = payload.slice(0, separator);
  const id = payload.slice(separator + 1);
  if (separator < 0 || !SCORE_PATTERN.test(score) || !ID_PATTERN.test(id)) {
    return null;
  }
  return { totalScore: Number(score), id };
};
