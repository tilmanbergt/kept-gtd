/**
 * The note or document Kept was opened from, as This-file targets for the
 * Files pane's rows and Quick Add's line (docs/dev/history/technical-design-easy-start.md §6.3).
 * Read when a user starts needing it (`active`) and again after every reopen
 * of the plugin (App.tsx calls `noteLaunchChanged`); the page is read only
 * when there is a file, and a failed read leaves only the row without a page.
 */
import {useEffect, useState, useSyncExternalStore} from 'react';
import {thisFileTargets, ThisFileTargets} from '../domain/linkTargets';
import {getCurrentPageNum, getRememberedLaunchNotePath} from '../supernote/hostContext';

let launchTick = 0;
const listeners = new Set<() => void>();

/** App.tsx's reorient: the plugin was (re)opened, maybe from another file or page. */
export function noteLaunchChanged(): void {
  launchTick += 1;
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThisFile(active: boolean): ThisFileTargets | null {
  const tick = useSyncExternalStore(subscribe, () => launchTick);
  const [targets, setTargets] = useState<ThisFileTargets | null>(null);
  useEffect(() => {
    if (!active) return;
    const path = getRememberedLaunchNotePath()?.path ?? null;
    if (!thisFileTargets(path, null)) {
      setTargets(null);
      return;
    }
    let cancelled = false;
    getCurrentPageNum().then(page => {
      if (!cancelled) setTargets(thisFileTargets(path, page));
    });
    return () => {
      cancelled = true;
    };
  }, [active, tick]);
  return active ? targets : null;
}
