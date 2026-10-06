import type {
  ApproachMeasurementDTO,
  CompareResponseSizesInput,
  CompareResponseSizesOutput,
  DurationStatsDTO,
} from '@application/dtos/compare.dto';
import { InvalidCompareOptionsError } from '@application/errors/invalid-compare-options.error';
import { UnexpectedError } from '@application/errors/unexpected.error';
import type { Clock } from '@application/interfaces/clock';
import type { PayloadCompressor, PayloadSizes } from '@application/interfaces/payload-compressor';
import type { LoadedPayload, PayloadSource } from '@application/interfaces/payload-source';
import type { PerformanceMonitor } from '@application/interfaces/performance-monitor';
import type { QueryCounter } from '@application/interfaces/query-counter';
import { fail, ok } from '@domain/shared/result';
import type { Result } from '@domain/shared/result';

export type CompareOptions = {
  /** Upper bound for `runs`: v1 takes hundreds of milliseconds per execution. */
  readonly maxRuns: number;
};

type RawMeasurement = Omit<ApproachMeasurementDTO, 'reductionVsBaseline'>;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const durationStats = (samples: readonly number[]): DurationStatsDTO => {
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  return {
    median: round(median, 1),
    min: round(sorted[0] ?? 0, 1),
    max: round(sorted[sorted.length - 1] ?? 0, 1),
  };
};

const ratio = (baseline: number, value: number): number =>
  value === 0 ? 0 : round(baseline / value, 1);

/**
 * GET /api/compare — runs every approach (sequentially, so they do not compete for the pool) and
 * reports, per approach: payload bytes (raw, gzip, brotli), response time and SQL query count.
 */
export class CompareResponseSizesUseCase {
  constructor(
    private readonly sources: readonly PayloadSource[],
    private readonly compressor: PayloadCompressor,
    private readonly queryCounter: QueryCounter,
    private readonly performanceMonitor: Pick<PerformanceMonitor, 'nowMs'>,
    private readonly clock: Clock,
    private readonly options: CompareOptions = { maxRuns: 10 },
  ) {}

  async execute(
    input: CompareResponseSizesInput,
  ): Promise<Result<CompareResponseSizesOutput, InvalidCompareOptionsError | UnexpectedError>> {
    if (!Number.isInteger(input.runs) || input.runs < 1 || input.runs > this.options.maxRuns) {
      return fail(
        new InvalidCompareOptionsError(
          `runs must be an integer between 1 and ${this.options.maxRuns}`,
        ),
      );
    }
    const [baselineSource] = this.sources;
    if (baselineSource === undefined) {
      return fail(new InvalidCompareOptionsError('No approach to compare'));
    }

    try {
      const measurements: RawMeasurement[] = [];
      for (const source of this.sources) {
        measurements.push(await this.measure(source, input.runs));
      }
      const baseline = measurements[0]?.bytes ?? { raw: 0, gzip: 0, brotli: 0 };
      return ok({
        measuredAt: this.clock.now().toISOString(),
        runs: input.runs,
        baseline: baselineSource.id,
        approaches: measurements.map((measurement) => ({
          ...measurement,
          reductionVsBaseline: {
            raw: ratio(baseline.raw, measurement.bytes.raw),
            gzip: ratio(baseline.gzip, measurement.bytes.gzip),
            brotli: ratio(baseline.brotli, measurement.bytes.brotli),
          },
        })),
      });
    } catch (error: unknown) {
      return fail(new UnexpectedError('Comparing the dashboard approaches', error));
    }
  }

  private async measure(source: PayloadSource, runs: number): Promise<RawMeasurement> {
    const durations: number[] = [];
    let payload: LoadedPayload = { body: '', records: 0 };
    let queries = 0;
    for (let run = 0; run < runs; run += 1) {
      const startedAt = this.performanceMonitor.nowMs();
      const measured = await this.queryCounter.run(
        async (scope): Promise<{ payload: LoadedPayload; queries: number }> => {
          const loaded = await source.load();
          return { payload: loaded, queries: scope.queries };
        },
      );
      durations.push(this.performanceMonitor.nowMs() - startedAt);
      payload = measured.payload;
      queries = measured.queries;
    }
    const bytes: PayloadSizes = await this.compressor.measure(payload.body);
    return {
      id: source.id,
      label: source.label,
      request: source.request,
      records: payload.records,
      dbQueries: queries,
      timeMs: durationStats(durations),
      bytes,
    };
  }
}
