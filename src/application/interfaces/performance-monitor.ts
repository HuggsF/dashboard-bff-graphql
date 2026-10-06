export interface PerformanceMonitor {
  /** Monotonic clock in milliseconds, suitable for measuring durations. */
  nowMs(): number;
}
