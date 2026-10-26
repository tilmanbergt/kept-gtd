/**
 * The settings as last read or written by storage/settingsStorage.ts, in memory
 * (docs/dev/history/technical-design-perf-threads.md §3.6,
 * docs/dev/history/technical-design-perf-current-page.md §3.1): lets a screen start
 * with the real values instead of the defaults, and lets it follow a change without
 * reading the settings again (ui/useSettings.ts). Null until a read succeeded and
 * while the stored settings are unreadable, so callers then load as usual.
 * Listeners hear only about a new object: settingsStorage.ts returns the same object
 * for unchanged stored settings. A module of its own, so tests that replace
 * settingsStorage.ts keep a working snapshot (always null for them).
 */
import {GtdParaSettings} from '../domain/settings';

let snapshot: GtdParaSettings | null = null;
const listeners = new Set<() => void>();

/** The last settings read or written, or null. */
export function peekSettings(): GtdParaSettings | null {
  return snapshot;
}

/** settingsStorage.ts only: after a successful read or write, or null after a failed read. */
export function rememberSettings(settings: GtdParaSettings | null): void {
  if (settings === snapshot) return;
  snapshot = settings;
  for (const listener of [...listeners]) listener();
}

/** Called whenever the snapshot becomes another object; returns the unsubscribe. */
export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
