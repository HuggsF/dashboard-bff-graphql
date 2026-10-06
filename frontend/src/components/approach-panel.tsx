import type { ReactElement, ReactNode } from 'react';
import type { Measurement } from '../lib/measure';
import type { Approach } from '../lib/types';
import { MetricCards } from './metric-cards';

type Props = {
  readonly approach: Approach;
  readonly method: 'GET' | 'POST';
  readonly endpoint: string;
  readonly summary: ReactNode;
  readonly loading: boolean;
  readonly error: string | null;
  readonly measurement: Measurement | null;
  readonly records: number | null;
  readonly recordsHint?: string;
  readonly note?: ReactNode;
  readonly onReload: () => void;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
};

/** Shared layout of the three tabs: endpoint, metrics, what the client got, the rendered rows. */
export const ApproachPanel = (props: Props): ReactElement => (
  <section className={`panel panel--${props.approach}`} aria-busy={props.loading}>
    <header className="panel__header">
      <div>
        <p className="panel__endpoint">
          <span className="method">{props.method}</span>
          <code>{props.endpoint}</code>
        </p>
        <p className="panel__summary">{props.summary}</p>
      </div>
      <button
        type="button"
        className="button button--ghost"
        onClick={props.onReload}
        disabled={props.loading}
      >
        {props.loading ? 'Measuring…' : 'Measure again'}
      </button>
    </header>

    {props.error !== null && (
      <p className="alert" role="alert">
        {props.error}. Is the backend up? <code>docker compose up -d</code>
      </p>
    )}

    <MetricCards
      measurement={props.measurement}
      records={props.records}
      recordsHint={props.recordsHint}
    />
    {props.note !== undefined && <p className="panel__note">{props.note}</p>}

    {props.children}
    {props.footer !== undefined && <footer className="panel__footer">{props.footer}</footer>}
  </section>
);
