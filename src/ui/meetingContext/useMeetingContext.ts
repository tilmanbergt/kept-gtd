/**
 * The context panel's data (docs/dev/history/technical-design-time-and-place.md §3.2):
 * Engage's source over the cache and the Inbox, built once per cache or
 * settings change, and `meetingContextOf` for the selected meeting - rebuilt
 * when the cache changes (the hooks re-render on notifyCacheChanged), never by
 * a timer. Logs the owner kind and mode once per meeting, never names.
 */
import {useEffect, useMemo} from 'react';
import {EngageSource, MeetingEntryRef} from '../../domain/engageOwner';
import {meetingContextOf, MeetingContextModel} from '../../domain/meetingContext';
import {CachedItem} from '../../storage/dataCache';
import {engageInboxOf, engageSourceOf} from '../../storage/engageAggregate';
import {ProjectFileState} from '../../storage/projectFile';
import {GtdParaSettings} from '../../domain/settings';
import {log} from '../../utils/log';

export interface MeetingContextData {
  source: EngageSource;
  model: MeetingContextModel | null;
}

export function useMeetingContext(
  entry: MeetingEntryRef | null,
  data: {items: readonly CachedItem[]; inbox: ProjectFileState | null; inboxPath: string | null; settings: GtdParaSettings | null},
): MeetingContextData {
  const {items, inbox, inboxPath, settings} = data;
  const noteSetups = settings?.noteSetups;
  const source = useMemo(
    () => engageSourceOf(items, engageInboxOf(inboxPath, inbox), noteSetups ?? []),
    [items, inbox, inboxPath, noteSetups],
  );
  const model = useMemo(() => (entry ? meetingContextOf(entry, source, Date.now()) : null), [entry, source]);
  const logKey = entry ? `${entry.item.path}#${entry.meetingIndex}` : null;
  useEffect(() => {
    if (logKey && model) log('MeetingContext: opened', model.owner?.kind ?? 'none', model.mode);
    // Once per meeting: the model changes with every cache change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logKey]);
  return {source, model};
}
