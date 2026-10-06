import type { Measurement } from './measure';

export type Approach = 'legacy' | 'bff' | 'graphql';

export const APPROACHES: readonly Approach[] = ['legacy', 'bff', 'graphql'];

export const APPROACH_LABEL: Readonly<Record<Approach, string>> = {
  legacy: 'Legacy REST',
  bff: 'BFF REST',
  graphql: 'GraphQL',
};

/** One measured call plus how many records it returned. */
export type ApproachResult = {
  readonly measurement: Measurement;
  readonly records: number;
};

export type ResultsByApproach = Readonly<Record<Approach, ApproachResult | null>>;
