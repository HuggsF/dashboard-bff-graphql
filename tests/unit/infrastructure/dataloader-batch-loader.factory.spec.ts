import { DataLoaderBatchLoaderFactory } from '@infrastructure/batching/dataloader-batch-loader.factory';

describe('DataLoaderBatchLoaderFactory', () => {
  it('batches keys requested within the same tick', async () => {
    const batchFn = jest.fn().mockImplementation((keys: readonly string[]) => {
      return Promise.resolve(keys.map((k) => `val_${k}`));
    });

    const factory = new DataLoaderBatchLoaderFactory({ batch: true, maxBatchSize: 100 });
    const loader = factory.create('testLoader', batchFn);

    const [val1, val2] = await Promise.all([loader.load('a'), loader.load('b')]);

    expect(val1).toBe('val_a');
    expect(val2).toBe('val_b');
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(['a', 'b']);
  });

  it('respects non-batched mode for legacy benchmarking', async () => {
    const batchFn = jest.fn().mockImplementation((keys: readonly string[]) => {
      return Promise.resolve(keys.map((k) => `val_${k}`));
    });

    const factory = new DataLoaderBatchLoaderFactory({ batch: false });
    const loader = factory.create('unbatchedLoader', batchFn);

    const [val1, val2] = await Promise.all([loader.load('x'), loader.load('y')]);

    expect(val1).toBe('val_x');
    expect(val2).toBe('val_y');
    expect(batchFn).toHaveBeenCalledTimes(2);
  });
});
