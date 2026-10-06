import DataLoader from 'dataloader';
import type {
  BatchFunction,
  BatchLoader,
  BatchLoaderFactory,
} from '@application/interfaces/batch-loader';

export type DataLoaderFactoryOptions = {
  /**
   * `true` (production): keys requested in the same tick are coalesced into one batch and
   * results are cached for the request. `false`: one call per key and no cache — the naive
   * resolver behaviour, kept to measure the N+1 problem.
   */
  readonly batch: boolean;
  /** Upper bound of keys per `IN (…)` list. */
  readonly maxBatchSize?: number;
};

export class DataLoaderBatchLoaderFactory implements BatchLoaderFactory {
  constructor(private readonly options: DataLoaderFactoryOptions = { batch: true }) {}

  create<K, V>(name: string, batch: BatchFunction<K, V>): BatchLoader<K, V> {
    return new DataLoader<K, V>(batch, {
      name,
      batch: this.options.batch,
      cache: this.options.batch,
      maxBatchSize: this.options.maxBatchSize ?? 500,
    });
  }
}
