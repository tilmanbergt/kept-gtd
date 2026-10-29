/**
 * After Quick Add filed an entry where the active context doesn't show it
 * (docs/dev/history/technical-design-time-and-place.md §3.3): "Saved to
 * Team · hidden by Home" in the status slot, so nothing seems lost.
 * Asked by the filtered screens (Daily, Week, Month) after a successful add;
 * a warning, so it shows over Quick Add's own "Added …" line.
 */
import {activeContext, contextMatcher, hiddenAddText} from '../../domain/contexts';
import {Destination} from '../../domain/destination';
import {todayIso} from '../../domain/meetingTime';
import {getCachedData} from '../../storage/dataCache';
import {peekSettings} from '../../storage/settingsSnapshot';
import {log} from '../../utils/log';
import {useStatusApi} from '../status/StatusProvider';

export function useHiddenAddNotice(name: string): (destination: Destination, entry: {kind: 'task' | 'meeting'; tags: readonly string[]}) => void {
  const statusApi = useStatusApi();
  return (destination, entry) => {
    if (destination.type !== 'item') return;
    const settings = peekSettings();
    const ctx = settings ? activeContext(settings) : null;
    const item = getCachedData()?.items.find(i => i.path === destination.path);
    if (!ctx || !item) return;
    const matcher = contextMatcher(ctx);
    const hidden =
      entry.kind === 'task' ? !matcher.taskShown(item, {tags: [...entry.tags], dueDate: null}, todayIso()) : matcher.meetingState(item, {tags: [...entry.tags]}) === 'dimmed';
    if (!hidden) return;
    log(`${name}: added outside the context`, entry.kind);
    const id = `${name}.hiddenAdd`;
    statusApi.show(id, {kind: 'warning', text: hiddenAddText(item.name, ctx.name), onDismiss: () => statusApi.clear(id)});
  };
}
