/**
 * Work that can wait until the page is on screen
 * (docs/dev/history/technical-design-perf-current-page.md §3.4): callbacks that run once,
 * right after the next e-ink flush of utils/screenRefresh.ts. A module of its own, so
 * tests that replace screenRefresh.ts keep a working (never flushing) registry.
 */
const afterFlush = new Set<() => void>();

/** Runs `callback` once, right after the next e-ink flush. Returns a function that cancels it. */
export function onNextEinkFlush(callback: () => void): () => void {
  afterFlush.add(callback);
  return () => {
    afterFlush.delete(callback);
  };
}

/** utils/screenRefresh.ts only: the flush happened. */
export function runAfterEinkFlush(): void {
  const callbacks = [...afterFlush];
  afterFlush.clear();
  for (const callback of callbacks) callback();
}
