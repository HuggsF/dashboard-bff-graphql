import {
  CompareResponseSizesUseCase,
  durationStats,
} from '@application/use-cases/compare-response-sizes.use-case';
import type { PayloadSource } from '@application/interfaces/payload-source';
import {
  FakePayloadCompressor,
  FakePerformanceMonitor,
  FakeQueryCounter,
  FixedClock,
} from '../../../support/fakes';

describe('CompareResponseSizesUseCase', () => {
  describe('durationStats helper', () => {
    it('calculates median, min, max correctly for odd counts', () => {
      const stats = durationStats([10, 5, 20]);
      expect(stats).toEqual({ min: 5, median: 10, max: 20 });
    });

    it('calculates median, min, max correctly for even counts', () => {
      const stats = durationStats([10, 20, 30, 40]);
      expect(stats).toEqual({ min: 10, median: 25, max: 40 });
    });
  });

  it('measures payload sizes, durations and query counts for multiple sources', async () => {
    const queryCounter = new FakeQueryCounter();
    const sourceA: PayloadSource = {
      id: 'legacy',
      label: 'REST Legacy',
      request: 'GET /api/v1/dashboard',
      load: jest.fn().mockImplementation(() => {
        queryCounter.record(5);
        return Promise.resolve({ body: 'x'.repeat(1000), records: 100 });
      }),
    };
    const sourceB: PayloadSource = {
      id: 'bff',
      label: 'REST BFF',
      request: 'GET /api/v2/dashboard',
      load: jest.fn().mockImplementation(() => {
        queryCounter.record(1);
        return Promise.resolve({ body: 'x'.repeat(100), records: 20 });
      }),
    };

    const compressor = new FakePayloadCompressor();
    const perfMonitor = new FakePerformanceMonitor([0, 100, 100, 120]);
    const clock = new FixedClock();

    const useCase = new CompareResponseSizesUseCase(
      [sourceA, sourceB],
      compressor,
      queryCounter,
      perfMonitor,
      clock,
      { maxRuns: 5 },
    );

    const result = await useCase.execute({ runs: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.runs).toBe(1);
      expect(result.data.baseline).toBe('legacy');
      expect(result.data.approaches).toHaveLength(2);
      expect(result.data.approaches[0]?.id).toBe('legacy');
      expect(result.data.approaches[0]?.dbQueries).toBe(5);
      expect(result.data.approaches[0]?.bytes.raw).toBe(1000);
      expect(result.data.approaches[1]?.id).toBe('bff');
      expect(result.data.approaches[1]?.dbQueries).toBe(1);
      expect(result.data.approaches[1]?.bytes.raw).toBe(100);
      expect(result.data.approaches[1]?.reductionVsBaseline.raw).toBe(10);
    }
  });

  it('rejects runs outside allowed range', async () => {
    const useCase = new CompareResponseSizesUseCase(
      [],
      new FakePayloadCompressor(),
      new FakeQueryCounter(),
      new FakePerformanceMonitor(),
      new FixedClock(),
      { maxRuns: 5 },
    );

    const resultLow = await useCase.execute({ runs: 0 });
    expect(resultLow.success).toBe(false);

    const resultHigh = await useCase.execute({ runs: 10 });
    expect(resultHigh.success).toBe(false);
  });

  it('fails when no sources are configured', async () => {
    const useCase = new CompareResponseSizesUseCase(
      [],
      new FakePayloadCompressor(),
      new FakeQueryCounter(),
      new FakePerformanceMonitor(),
      new FixedClock(),
      { maxRuns: 5 },
    );

    const result = await useCase.execute({ runs: 2 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('No approach to compare');
    }
  });

  it('captures unexpected errors during measurement', async () => {
    const failingSource: PayloadSource = {
      id: 'broken',
      label: 'Broken',
      request: 'GET /broken',
      load: jest.fn().mockRejectedValue(new Error('Source failed')),
    };
    const useCase = new CompareResponseSizesUseCase(
      [failingSource],
      new FakePayloadCompressor(),
      new FakeQueryCounter(),
      new FakePerformanceMonitor(),
      new FixedClock(),
      { maxRuns: 5 },
    );

    const result = await useCase.execute({ runs: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Comparing the dashboard approaches');
    }
  });
});
