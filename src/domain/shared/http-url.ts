/**
 * Absolute http(s) URL: scheme, host (optionally with port), then an optional path/query/fragment
 * without whitespace. Anything else (`javascript:`, `data:`, relative paths…) is rejected, since
 * these URLs end up in `<img src>` / `<a href>` attributes on the frontend.
 */
const HTTP_URL_PATTERN = /^https?:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]+(?::\d{1,5})?(?:[/?#]\S*)?$/i;

export const HTTP_URL_MAX_LENGTH = 2048;

export const isHttpUrl = (value: string): boolean =>
  value.length <= HTTP_URL_MAX_LENGTH && HTTP_URL_PATTERN.test(value);
