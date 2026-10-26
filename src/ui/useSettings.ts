/**
 * The settings for a component (docs/dev/history/technical-design-perf-current-page.md §3.1):
 * the in-memory snapshot (storage/settingsSnapshot.ts), live, instead of each component
 * reading AsyncStorage and setting its own state when the read lands.
 *
 * - `useSettings()` re-renders when the snapshot becomes another object: after a write,
 *   or a read that found changed stored settings - never for a read that found nothing
 *   new (storage/settingsStorage.ts returns the same object then).
 * - `useSettingsValue(select, equal)` re-renders only when the selected value changes.
 *
 * Without a snapshot yet (cold start, unreadable settings, tests that replace
 * settingsStorage.ts) both load once and use that result.
 */
import {useEffect, useRef, useState} from 'react';
import {GtdParaSettings} from '../domain/settings';
import {loadSettings} from '../storage/settingsStorage';
import {peekSettings, subscribeSettings} from '../storage/settingsSnapshot';
import {errorMessage} from '../utils/errorMessage';
import {logWarn} from '../utils/log';

/** Follows the snapshot, or the one load when there is none; `apply` gets every settings object to use. */
function useSettingsSource(apply: (settings: GtdParaSettings) => void): void {
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeSettings(() => {
      const next = peekSettings();
      if (next) applyRef.current(next);
    });
    const known = peekSettings();
    if (known) applyRef.current(known);
    else {
      loadSettings()
        .then(loaded => {
          if (!cancelled) applyRef.current(peekSettings() ?? loaded);
        })
        .catch(e => logWarn('useSettings: settings not loaded', errorMessage(e)));
    }
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
}

/** The settings, or null until they are known. */
export function useSettings(): GtdParaSettings | null {
  const [settings, setSettings] = useState<GtdParaSettings | null>(() => peekSettings());
  useSettingsSource(setSettings);
  return settings;
}

/** One value of the settings (`select` may change between renders; `equal` decides what is a change), or null until known. */
export function useSettingsValue<T>(select: (settings: GtdParaSettings) => T, equal: (a: T, b: T) => boolean = Object.is): T | null {
  const [value, setValue] = useState<T | null>(() => {
    const known = peekSettings();
    return known ? select(known) : null;
  });
  const selectRef = useRef(select);
  selectRef.current = select;
  useSettingsSource(settings => {
    const next = selectRef.current(settings);
    setValue(prev => (prev !== null && equal(prev, next) ? prev : next));
  });
  return value;
}
