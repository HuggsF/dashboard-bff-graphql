import { useEffect, useState } from 'react';
import { measuredFetch, parseJson } from '../lib/measure';
import type { Measurement } from '../lib/measure';

export type MeasuredJson<T> = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly data: T | null;
  readonly measurement: Measurement | null;
};

const INITIAL = { loading: true, error: null, data: null, measurement: null } as const;

/** GET `url` as JSON and measure it. Changing `url` or `reloadKey` fetches again. */
export const useMeasuredJson = <T>(url: string, reloadKey: number): MeasuredJson<T> => {
  const [state, setState] = useState<MeasuredJson<T>>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));

    measuredFetch(url, { headers: { accept: 'application/json' }, signal: controller.signal })
      .then(({ response, measurement, body }) => {
        if (!response.ok) throw new Error(`${url} answered HTTP ${response.status}`);
        if (!controller.signal.aborted) {
          setState({ loading: false, error: null, data: parseJson(body) as T, measurement });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({ ...previous, loading: false, error: message }));
      });

    return () => controller.abort();
  }, [url, reloadKey]);

  return state;
};
