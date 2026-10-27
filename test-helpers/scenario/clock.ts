/**
 * A fixed "now" for scenarios whose expectations depend on the date (docs/dev/history/technical-design-test-tiers.md §3.4).
 * Only the clock is faked: timers stay real, so the app's settling works as everywhere else. The test file
 * restores the real clock with `afterEach(() => jest.useRealTimers())`.
 */
export function fixedClock(now: Date): void {
  jest.useFakeTimers({
    now,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
  });
}
