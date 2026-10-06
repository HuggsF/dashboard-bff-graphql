import type { PayloadSizes } from '@application/interfaces/payload-compressor';

export type CompareResponseSizesInput = {
  /** How many times each approach is executed; times are reported as median/min/max. */
  readonly runs: number;
};

export type DurationStatsDTO = {
  readonly median: number;
  readonly min: number;
  readonly max: number;
};

export type ApproachMeasurementDTO = {
  readonly id: string;
  readonly label: string;
  readonly request: string;
  readonly records: number;
  /** SQL statements executed to build ONE response. */
  readonly dbQueries: number;
  readonly timeMs: DurationStatsDTO;
  readonly bytes: PayloadSizes;
  /** How many times smaller than the baseline (first approach) the payload is. */
  readonly reductionVsBaseline: PayloadSizes;
};

export type CompareResponseSizesOutput = {
  readonly measuredAt: string;
  readonly runs: number;
  readonly baseline: string;
  readonly approaches: readonly ApproachMeasurementDTO[];
};
