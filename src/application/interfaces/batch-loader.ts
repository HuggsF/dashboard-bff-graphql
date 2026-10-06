/** Batches and caches lookups by key for the duration of one request (DataLoader semantics). */
export interface BatchLoader<K, V> {
  load(key: K): Promise<V>;
}

/**
 * Receives every key requested during one tick and returns one value (or Error) per key,
 * in the same order as the keys.
 */
export type BatchFunction<K, V> = (keys: readonly K[]) => Promise<readonly (V | Error)[]>;

export interface BatchLoaderFactory {
  create<K, V>(name: string, batch: BatchFunction<K, V>): BatchLoader<K, V>;
}
