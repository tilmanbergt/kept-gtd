/**
 * The home notebooks of the Projects and Areas a screen shows
 * (docs/dev/history/technical-design-home-notebooks.md §3.1): `of(item)`
 * gives an item's notebook with its known state, or null when the Default
 * has no notebook. One `statFiles` call per item set
 * (storage/homeNotebooks.ts's state cache), refreshed when the cache or a
 * notebook's folder changes, when the plugin is opened again (the files are
 * checked) and when the screen is shown again; the screen
 * never polls. The settings come from the snapshot (ui/useSettings.ts), so
 * a change of the Default arrives at once.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {CachedItem, subscribeCache, subscribeFilesChecked} from '../storage/dataCache';
import {HomeNotebook, homeNotebookOf, refreshHomeNotebookStates, subscribeHomeNotebookStates} from '../storage/homeNotebooks';
import {subscribeFolderChanges} from '../supernote/fileSystem';
import {requestEinkRefresh} from '../utils/screenRefresh';
import {useOnScreenShow, useScreenActivity} from './screenActivity';
import {samePaths, useSettingsValue} from './useSettings';
import {GtdParaSettings, resolvePaths} from '../domain/settings';

type ItemRef = Pick<CachedItem, 'path' | 'name' | 'abbrev'>;

export interface HomeNotebooks {
  /** The item's home notebook, or null (no Default notebook, the Inbox, settings not loaded yet). */
  of: (item: ItemRef | null | undefined) => HomeNotebook | null;
  /** Whether the Default has a notebook, so the feature shows at all. */
  enabled: boolean;
}

const keepSettings = (settings: GtdParaSettings) => settings;
const sameForHomeNotebooks = (a: GtdParaSettings, b: GtdParaSettings) =>
  a.noteSetupDefaults.notebook === b.noteSetupDefaults.notebook && samePaths(resolvePaths(a), resolvePaths(b));

export function useHomeNotebooks(items: readonly ItemRef[]): HomeNotebooks {
  // The settings snapshot, live (ui/useSettings.ts): a change in Settings arrives without a read here.
  // Kept while what a home notebook depends on (the Default's notebook, the folders) is the same, so
  // a change of another setting renders nothing (storage/homeNotebooks.ts's homeNotebookOf).
  const settings = useSettingsValue(keepSettings, sameForHomeNotebooks);
  const [, setTick] = useState(0);
  const activity = useScreenActivity();

  const notebooks = useMemo(
    () => (settings ? items.map(item => homeNotebookOf(item, settings)).filter((nb): nb is HomeNotebook => nb !== null) : []),
    [items, settings],
  );
  const pathsKey = notebooks.map(nb => nb.absolutePath).join('\n');
  const foldersRef = useRef(new Set<string>());
  foldersRef.current = new Set(notebooks.map(nb => nb.folder));

  const refresh = useCallback(() => {
    if (pathsKey) void refreshHomeNotebookStates(pathsKey.split('\n'));
  }, [pathsKey]);
  useEffect(refresh, [refresh]);
  useOnScreenShow(refresh);

  useEffect(() => {
    const unsubscribeStates = subscribeHomeNotebookStates(() => {
      if (!activity.isActive()) return;
      setTick(t => t + 1);
      // The icons change without a tap.
      requestEinkRefresh();
    });
    const unsubscribeCache = subscribeCache(() => {
      if (activity.isActive()) refresh();
    });
    const unsubscribeFolders = subscribeFolderChanges(folder => {
      if (activity.isActive() && foldersRef.current.has(folder)) refresh();
    });
    // The plugin was opened again: a notebook may have been made or deleted in Supernote meanwhile.
    const unsubscribeChecked = subscribeFilesChecked(() => {
      if (activity.isActive()) refresh();
    });
    return () => {
      unsubscribeStates();
      unsubscribeCache();
      unsubscribeFolders();
      unsubscribeChecked();
    };
  }, [activity, refresh]);

  const of = useCallback((item: ItemRef | null | undefined) => (settings && item ? homeNotebookOf(item, settings) : null), [settings]);
  return {of, enabled: !!settings?.noteSetupDefaults.notebook};
}
