/**
 * Counts renders per component on the fake device
 * (docs/dev/history/technical-design-perf-current-page.md §7): a scenario test replaces
 * utils/perf.ts with `perfWithRenderCounts()`, whose `usePerfRender` counts every call
 * by name and then does what the real one does.
 */
const counts = new Map<string, number>();

/** utils/perf.ts with a counting `usePerfRender` - for `jest.mock('…/src/utils/perf', …)`. */
export function perfWithRenderCounts(): Record<string, unknown> {
  const actual = jest.requireActual('../src/utils/perf');
  return {
    ...actual,
    usePerfRender: (name: string) => {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      actual.usePerfRender(name);
    },
  };
}

export function resetRenderCounts(): void {
  counts.clear();
}

/** Renders per component since the last reset, by name. */
export function renderCounts(): Record<string, number> {
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
