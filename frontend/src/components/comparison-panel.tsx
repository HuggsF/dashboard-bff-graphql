import type { CSSProperties, ReactElement } from 'react';
import { COMPARISON_RUNS } from '../lib/compare';
import { formatBytes, formatCount, formatEncoding, formatMs, formatRatio } from '../lib/format';
import { APPROACH_LABEL, APPROACHES } from '../lib/types';
import type { Approach, ApproachResult, ResultsByApproach } from '../lib/types';

type Props = {
  readonly results: ResultsByApproach | null;
  readonly running: Approach | null;
  readonly error: string | null;
  readonly onRun: () => void;
};

type BarMetric = {
  readonly label: string;
  readonly hint: string;
  readonly read: (result: ApproachResult) => number | null;
  readonly format: (value: number | null) => string;
  /** "smaller" for sizes, "faster" for time. */
  readonly better: string;
  readonly detail?: (result: ApproachResult) => string;
};

const BAR_METRICS: readonly BarMetric[] = [
  {
    label: 'Payload on the wire',
    hint: 'compressed bytes the browser downloaded',
    read: (result) => result.measurement.transferredBytes,
    format: formatBytes,
    better: 'smaller',
    detail: (result) => formatEncoding(result.measurement.encoding),
  },
  {
    label: 'JSON to parse',
    hint: 'decompressed body handed to JSON.parse',
    read: (result) => result.measurement.rawBytes,
    format: formatBytes,
    better: 'smaller',
  },
  {
    label: 'Response time',
    hint: `median of ${COMPARISON_RUNS} runs, request → body received`,
    read: (result) => result.measurement.durationMs,
    format: formatMs,
    better: 'faster',
  },
];

const ratioLabel = (
  baseline: number | null,
  value: number | null,
  better: string,
): string | null => {
  if (baseline === null || value === null || value <= 0 || baseline <= value) return null;
  return formatRatio(baseline, value).replace('smaller', better);
};

const Bars = ({
  metric,
  results,
}: {
  readonly metric: BarMetric;
  readonly results: ResultsByApproach;
}) => {
  const values = APPROACHES.map((approach) => {
    const result = results[approach];
    return result === null ? null : metric.read(result);
  });
  const max = Math.max(...values.map((value) => value ?? 0), 1);
  const baseline = values[0] ?? null;

  return (
    <div className="bars">
      <div className="bars__title">
        <h3>{metric.label}</h3>
        <p>{metric.hint}</p>
      </div>
      {APPROACHES.map((approach, index) => {
        const value = values[index] ?? null;
        const ratio = index === 0 ? null : ratioLabel(baseline, value, metric.better);
        const result = results[approach];
        const detail =
          result === null || metric.detail === undefined ? null : metric.detail(result);
        return (
          <div key={approach} className={`bar bar--${approach}`}>
            <span className="bar__label">{APPROACH_LABEL[approach]}</span>
            <span className="bar__track">
              <span
                className="bar__fill"
                style={{ '--bar': `${((value ?? 0) / max) * 100}%` } as CSSProperties}
              />
            </span>
            <span className="bar__value">
              {metric.format(value)}
              {detail !== null && <span className="bar__detail"> {detail}</span>}
              {ratio !== null && <span className="bar__ratio">{ratio}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Side-by-side: page 1 of each approach, measured from this browser, one approach at a time. */
export const ComparisonPanel = ({ results, running, error, onRun }: Props): ReactElement => (
  <section className="comparison" aria-labelledby="comparison-title" aria-busy={running !== null}>
    <header className="comparison__header">
      <div>
        <h2 id="comparison-title">Side by side</h2>
        <p>
          The dashboard card needs 20 students × 3 fields (name, score, avatar). Each approach is
          called {COMPARISON_RUNS}× from this browser, sequentially, through the same proxy.
        </p>
      </div>
      <button
        type="button"
        className="button button--primary"
        onClick={onRun}
        disabled={running !== null}
      >
        {running === null ? 'Run again' : `Measuring ${APPROACH_LABEL[running]}…`}
      </button>
    </header>

    {error !== null && (
      <p className="alert" role="alert">
        {error}. Is the backend up? <code>docker compose up -d</code>
      </p>
    )}

    {results === null ? (
      <p className="comparison__empty">
        {running === null ? 'No measurements yet.' : 'Measuring…'}
      </p>
    ) : (
      <>
        <div className="comparison__bars">
          {BAR_METRICS.map((metric) => (
            <Bars key={metric.label} metric={metric} results={results} />
          ))}
        </div>
        <table className="comparison__table">
          <thead>
            <tr>
              <th scope="col">Per request</th>
              {APPROACHES.map((approach) => (
                <th key={approach} scope="col" className={`col--${approach}`}>
                  {APPROACH_LABEL[approach]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Records returned</th>
              {APPROACHES.map((approach) => (
                <td key={approach}>{formatCount(results[approach]?.records ?? null)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">SQL queries</th>
              {APPROACHES.map((approach) => (
                <td key={approach}>
                  {formatCount(results[approach]?.measurement.sqlQueries ?? null)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Who ranks the students</th>
              <td>the browser</td>
              <td>MySQL</td>
              <td>MySQL</td>
            </tr>
          </tbody>
        </table>
        <p className="comparison__footnote">
          GraphQL goes through Apollo Client, which adds <code>__typename</code> to every selection
          set for its cache (about +1.2 KB of JSON per page). The server-side benchmark in the
          README sends the bare selection. The BFF runs 2 queries: the page and a <code>COUNT</code>{' '}
          for its pagination metadata. Browsers only offer brotli over HTTPS and on localhost;
          elsewhere the backend falls back to gzip, so the wire sizes depend on how you reach this
          page.
        </p>
      </>
    )}
  </section>
);
