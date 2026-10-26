/**
 * The settings as last read or written by storage/settingsStorage.ts, in memory
 * (docs/dev/history/technical-design-perf-threads.md §3.6): lets a screen start
 * with the real values instead of the defaults while its own `loadSettings()` is
 * still running. Null until a read succeeded and while the stored settings are
 * unreadable, so callers then load as usual. A module of its own, so tests that
 * replace settingsStorage.ts keep a working snapshot (always null for them).
 */
import {GtdParaSettings} from '../domain/settings';

let snapshot: GtdParaSettings | null = null;

/** The last settings read or written, or null. */
export function peekSettings(): GtdParaSettings | null {
  return snapshot;
}

/** settingsStorage.ts only: after a successful read or write, or null after a failed read. */
export function rememberSettings(settings: GtdParaSettings | null): void {
  snapshot = settings;
}
