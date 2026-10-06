const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** Binary units, like the backend benchmark (1 MB = 1,048,576 bytes). */
export const formatBytes = (bytes: number | null): string => {
  if (bytes === null) return '—';
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit] ?? 'B'}`;
};

export const formatMs = (ms: number | null): string => {
  if (ms === null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(ms < 10 ? 1 : 0)} ms`;
};

export const formatCount = (value: number | null): string =>
  value === null ? '—' : value.toLocaleString('en-US');

const ENCODING_LABEL: Readonly<Record<string, string>> = {
  br: 'brotli',
  gzip: 'gzip',
  deflate: 'deflate',
};

export const formatEncoding = (encoding: string | null): string =>
  encoding === null ? 'uncompressed' : (ENCODING_LABEL[encoding] ?? encoding);

export const formatRatio = (baseline: number, value: number): string => {
  if (value <= 0) return '—';
  const ratio = baseline / value;
  return `${ratio >= 100 ? Math.round(ratio).toLocaleString('en-US') : ratio.toFixed(1)}× smaller`;
};
