/**
 * What Daily and focus mode load (docs/dev/history/technical-design-daily-slim.md §3.3):
 * the live items and Inbox from the cache, the folders, the settings snapshot
 * and today's and tomorrow's dates.
 *
 * - Cache ready at mount (the usual case): no loading pass, the first render
 *   shows content and one e-ink refresh follows its commit. A missing Inbox
 *   copy loads in the background.
 * - No cache yet: a spinner while the cache is built from the files.
 *
 * `daily:firstContent` (perf trace) spans from the mount to the first commit
 * with content. A kept tab shown again re-renders once when the date changed
 * while it was hidden.
 */
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {isoDateOffset, todayIso} from '../../domain/meetingTime';
import {GtdParaSettings, ResolvedParaPaths} from '../../domain/settings';
import {CachedItem, getCachedData, getCachedInbox, rebuildCache, setCachedInbox} from '../../storage/dataCache';
import {loadProjectFile, ProjectFileState} from '../../storage/projectFile';
import {loadSettings} from '../../storage/settingsStorage';
import {useCachedInbox} from '../../ui/useCachedInbox';
import {useCachedItems} from '../../ui/useCachedItems';
import {useSettings} from '../../ui/useSettings';
import {useOnScreenShow} from '../../ui/screenActivity';
import {errorMessage} from '../../utils/errorMessage';
import {logError} from '../../utils/log';
import {perfEnd, perfStart} from '../../utils/perf';
import {requestEinkRefresh, useEinkRefreshOnLoad} from '../../utils/screenRefresh';

export interface DailyData {
  loading: boolean;
  error: string | null;
  /** Builds the cache again from the files (the load error's Retry). */
  retry: () => void;
  items: CachedItem[];
  inbox: ProjectFileState | null;
  inboxPath: string | null;
  paths: ResolvedParaPaths | null;
  settings: GtdParaSettings | null;
  todayDate: string;
  tomorrowDate: string;
}

export function useDailyData(name: string): DailyData {
  const items = useCachedItems();
  const inbox = useCachedInbox();
  const settings = useSettings();
  const [paths, setPaths] = useState<ResolvedParaPaths | null>(() => getCachedData()?.paths ?? null);
  const [loading, setLoading] = useState(() => getCachedData() === null);
  const [error, setError] = useState<string | null>(null);
  useEinkRefreshOnLoad(loading);

  const load = useCallback(
    async (forceRebuild: boolean) => {
      const perfToken = perfStart();
      setLoading(true);
      setError(null);
      try {
        let cache = getCachedData();
        if (!cache || forceRebuild) cache = await rebuildCache(await loadSettings());
        // The rebuild above already read Inbox.txt into the shared cache.
        const loadedInbox = (!forceRebuild && getCachedInbox()) || (await loadProjectFile('inbox', cache.paths.inboxFolder));
        setCachedInbox(loadedInbox);
        setPaths(cache.paths);
      } catch (e) {
        const message = errorMessage(e);
        logError(`${name}: load failed`, message);
        setError(message);
      } finally {
        perfEnd('screen:load', perfToken, {screen: name, forceRebuild});
        setLoading(false);
      }
    },
    [name],
  );

  useEffect(() => {
    const cache = getCachedData();
    if (!cache) {
      load(false);
      return;
    }
    // Content is already on screen: the Inbox copy (if missing) arrives quietly, and the first frame gets its refresh.
    requestEinkRefresh();
    if (!getCachedInbox()) {
      loadProjectFile('inbox', cache.paths.inboxFolder)
        .then(loaded => {
          if (!getCachedInbox()) setCachedInbox(loaded);
        })
        .catch(e => logError(`${name}: loading the Inbox failed`, errorMessage(e)));
    }
    // Only ever auto-loads once, on mount; Settings → Advanced → Reload all files is the explicit rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mountToken = useRef(perfStart());
  const firstContentDone = useRef(false);
  useLayoutEffect(() => {
    if (firstContentDone.current || loading || error) return;
    firstContentDone.current = true;
    perfEnd('daily:firstContent', mountToken.current, {screen: name});
  });

  // Only forces the re-render; the dates are read from the clock.
  const [, setShownDay] = useState(() => todayIso());
  useOnScreenShow(() => setShownDay(todayIso()));
  const todayDate = todayIso();

  return {
    loading,
    error,
    retry: () => load(true),
    items,
    inbox,
    inboxPath: paths?.inboxFolder ?? null,
    paths,
    settings,
    todayDate,
    tomorrowDate: isoDateOffset(1),
  };
}
