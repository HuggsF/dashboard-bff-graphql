import { ProcessPerformanceMonitor } from '@infrastructure/system/process-performance-monitor';
import { SystemClock } from '@infrastructure/system/system-clock';

describe('System Infrastructure', () => {
  it('SystemClock returns a Date close to now', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const now = clock.now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });

  it('ProcessPerformanceMonitor returns millisecond timestamp from performance.now', () => {
    const monitor = new ProcessPerformanceMonitor();
    const time1 = monitor.nowMs();
    const time2 = monitor.nowMs();

    expect(typeof time1).toBe('number');
    expect(time2).toBeGreaterThanOrEqual(time1);
  });
});
