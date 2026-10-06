import { constants } from 'node:zlib';
import type { BrotliOptions, ZlibOptions } from 'node:zlib';

/**
 * Compression settings shared by the HTTP middleware and by the /api/compare measurements, so
 * the sizes reported by /api/compare are the sizes actually sent on the wire.
 */
export const GZIP_OPTIONS: ZlibOptions = { level: constants.Z_DEFAULT_COMPRESSION };

/**
 * Brotli quality 4 (the `compression` package default): close to gzip-6 in CPU cost with a better
 * ratio. Quality 11 compresses ~15-20 % better but is far too slow for dynamic responses.
 */
export const BROTLI_OPTIONS: BrotliOptions = {
  params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
};
