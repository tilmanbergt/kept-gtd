/**
 * The chosen count tab per screen (docs/dev/history/technical-design-calmer-screens.md
 * §3.5): `daily`, `current`. Memory only, never saved - Kept starts on the
 * first tab. A link can choose the tab before its screen shows (`setListTab`,
 * the way "Daily → Inbox" opens). A profile switch forgets them all
 * (`resetListTabs`).
 */
import {useCallback, useSyncExternalStore} from 'react';
import {log} from '../utils/log';

const tabs = new Map<string, string>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Chooses `tab` on `screen`'s list. */
export function setListTab(screen: string, tab: string): void {
  if (tabs.get(screen) === tab) return;
  tabs.set(screen, tab);
  log(`listTab ${screen} ${tab}`);
  for (const listener of [...listeners]) listener();
}

/** The tab chosen on `screen`, or null. */
export function getListTab(screen: string): string | null {
  return tabs.get(screen) ?? null;
}

/** Forgets every chosen tab (profile switch). */
export function resetListTabs(): void {
  if (tabs.size === 0) return;
  tabs.clear();
  for (const listener of [...listeners]) listener();
}

/** The tab chosen on `screen` (or `fallback`), its setter, and whether one was chosen at all. */
export function useListTab<K extends string>(screen: string, fallback: K): [K, (tab: K) => void, boolean] {
  const get = useCallback(() => (tabs.get(screen) as K | undefined) ?? null, [screen]);
  const chosen = useSyncExternalStore(subscribe, get);
  const set = useCallback((next: K) => setListTab(screen, next), [screen]);
  return [chosen ?? fallback, set, chosen !== null];
}
