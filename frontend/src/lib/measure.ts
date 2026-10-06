/** What the browser actually paid for one API call. */
export type Measurement = {
  readonly url: string;
  readonly status: number;
  /** Request start → body fully received. */
  readonly durationMs: number;
  /** Decompressed JSON size: what JavaScript has to parse. */
  readonly rawBytes: number;
  /** Body bytes on the wire (gzip/brotli), from the Resource Timing API. */
  readonly transferredBytes: number | null;
  /** Content-Encoding the backend picked from the browser's Accept-Encoding (null = identity). */
  readonly encoding: string | null;
  /** Read from the backend's X-DB-Query-Count header. */
  readonly sqlQueries: number | null;
};

const QUERY_COUNT_HEADER = 'x-db-query-count';

// Every request leaves a Resource Timing entry; keep enough of them to find ours.
performance.setResourceTimingBufferSize(2000);

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const nextTask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Latest Resource Timing entry for this URL that started after `startedAt`. */
const findTiming = (url: string, startedAt: number): PerformanceResourceTiming | undefined => {
  const absolute = new URL(url, window.location.href).href;
  const entries = performance.getEntriesByName(absolute, 'resource');
  const timing = entries
    .filter(
      (entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming,
    )
    .filter((entry) => entry.startTime >= startedAt - 1)
    .at(-1);
  return timing;
};

/**
 * `fetch` that also measures the call. The body is read from a clone, so the original response
 * can still be consumed by the caller (Apollo's HttpLink, `response.json()`…).
 */
export const measuredFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{
  readonly response: Response;
  readonly measurement: Measurement;
  readonly body: ArrayBuffer;
}> => {
  const url = urlOf(input);
  const startedAt = performance.now();
  const response = await fetch(input, init);
  const body = await response.clone().arrayBuffer();
  const durationMs = performance.now() - startedAt;

  await nextTask(); // the timing entry is recorded once the body has been read
  const timing = findTiming(url, startedAt);
  const queries = response.headers.get(QUERY_COUNT_HEADER);

  return {
    response,
    body,
    measurement: {
      url,
      status: response.status,
      durationMs,
      rawBytes: body.byteLength,
      transferredBytes:
        timing !== undefined && timing.encodedBodySize > 0 ? timing.encodedBodySize : null,
      encoding: response.headers.get('content-encoding'),
      sqlQueries: queries === null ? null : Number(queries),
    },
  };
};

/** Parses a body already read by `measuredFetch` (no second network read). */
export const parseJson = (body: ArrayBuffer): unknown => JSON.parse(new TextDecoder().decode(body));

/** Adapter for Apollo's HttpLink: reports every GraphQL call to `onMeasure`. */
export const createMeasuringFetch =
  (onMeasure: (measurement: Measurement, body: ArrayBuffer) => void) =>
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { response, measurement, body } = await measuredFetch(input, init);
    onMeasure(measurement, body);
    return response;
  };
