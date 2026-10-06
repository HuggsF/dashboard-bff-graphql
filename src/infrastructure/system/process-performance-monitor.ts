import { performance } from 'node:perf_hooks';
import type { PerformanceMonitor } from '@application/interfaces/performance-monitor';

export class ProcessPerformanceMonitor implements PerformanceMonitor {
  nowMs(): number {
    return performance.now();
  }
}
