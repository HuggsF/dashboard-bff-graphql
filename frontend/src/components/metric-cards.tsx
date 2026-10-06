import type { ReactElement } from 'react';
import { formatBytes, formatCount, formatEncoding, formatMs } from '../lib/format';
import type { Measurement } from '../lib/measure';

type Props = {
  readonly measurement: Measurement | null;
  readonly records: number | null;
  readonly recordsHint?: string;
};

type Card = { readonly label: string; readonly value: string; readonly hint: string };

/** The 4 numbers the SPEC asks for (time, size, records) + the SQL query count from the backend. */
export const MetricCards = ({ measurement, records, recordsHint }: Props): ReactElement => {
  const cards: readonly Card[] = [
    {
      label: 'Response time',
      value: formatMs(measurement?.durationMs ?? null),
      hint: 'request → body received',
    },
    {
      label: 'Payload on the wire',
      value: formatBytes(measurement?.transferredBytes ?? null),
      hint:
        measurement === null
          ? 'compressed (Resource Timing)'
          : `${formatEncoding(measurement.encoding)} · Resource Timing`,
    },
    {
      label: 'JSON size',
      value: formatBytes(measurement?.rawBytes ?? null),
      hint: 'decompressed, to be parsed',
    },
    { label: 'Records', value: formatCount(records), hint: recordsHint ?? 'rows in the response' },
    {
      label: 'SQL queries',
      value: formatCount(measurement?.sqlQueries ?? null),
      hint: 'X-DB-Query-Count header',
    },
  ];

  return (
    <dl className="metrics">
      {cards.map((card) => (
        <div key={card.label} className="metric">
          <dt className="metric__label">{card.label}</dt>
          <dd className="metric__value">{card.value}</dd>
          <dd className="metric__hint">{card.hint}</dd>
        </div>
      ))}
    </dl>
  );
};
