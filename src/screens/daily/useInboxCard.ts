/**
 * The Inbox card's data for the selected Inbox todo or meeting
 * (docs/dev/history/technical-design-calmer-screens.md §3.7): the caption,
 * the ranked File to places (domain/inboxFileTo.ts over the cache's
 * Projects and Areas, storage/tagOwners.ts and the recent places), and the
 * actions - filing through ui/useInboxFiling.ts, then the next Inbox row
 * (the one after, else the one before) shows as card; with none left the
 * box collapses. Done, Edit and Delete are the todo's or meeting's own card
 * actions. Used by Daily's Inbox tab and the Review's "Inbox to zero".
 */
import {FileToItem} from '../../domain/captureFileTo';
import {formatDate, formatDayHeader} from '../../domain/dateFormat';
import {inboxFileTo} from '../../domain/inboxFileTo';
import {InboxListEntry, nextInboxRow} from '../../domain/inboxCount';

export type {InboxListEntry} from '../../domain/inboxCount';
import {todayIso} from '../../domain/meetingTime';
import {meetingDisplayTitle} from '../../domain/meetingTracking';
import {displayTaskText} from '../../domain/taskLabels';
import {Meeting, Task} from '../../domain/types';
import {CachedItem} from '../../storage/dataCache';
import {getRecentDestinationsSync} from '../../storage/destinationUsage';
import {tagOwners} from '../../storage/tagOwners';
import {InboxCardData} from '../../ui/itemCard/InboxCard';
import {MeetingCardData} from '../../ui/itemCard/useMeetingCard';
import {TodoCardData} from '../../ui/itemCard/useTodoCard';
import {FileVia, InboxEntry, useInboxFiling} from '../../ui/useInboxFiling';
import {log} from '../../utils/log';

interface Input {
  name: string;
  /** The selected Inbox todo or meeting, or null. */
  entry: InboxEntry | null;
  items: readonly CachedItem[];
  inboxPath: string | null;
  /** The Inbox list's todos and meetings in their order, for the next one. */
  order: readonly InboxListEntry[];
  /** Shows that row's card (the screen's selection). */
  select: (row: InboxListEntry) => void;
  /** Ends the selection: the box collapses. */
  close: () => void;
  todoCard: TodoCardData | null;
  meetingCard: MeetingCardData | null;
  onMore?: () => void;
  onNewProject?: () => void;
}

export function useInboxCard(input: Input): InboxCardData | null {
  const filing = useInboxFiling(input.name, input.inboxPath);
  const {entry} = input;
  if (!entry) return null;
  const today = todayIso();
  const tags = entry.kind === 'task' ? entry.task.tags : entry.meeting.tags;
  const places = input.items.filter((i): i is CachedItem & FileToItem => i.kind === 'project' || i.kind === 'area');
  const suggestions = inboxFileTo({tags, places, tagOwners: tagOwners(input.items), recent: getRecentDestinationsSync() ?? []});
  const created = entry.kind === 'task' ? entry.task.fields.created : null;
  const caption = entry.kind === 'task' ? (created ? `Inbox · captured ${formatDate(created, today)}` : 'Inbox') : `Inbox · ${formatDayHeader(entry.meeting.date, today)}`;
  const file = (place: FileToItem, via: FileVia) => {
    const filed: InboxListEntry = {type: entry.kind, index: entry.index};
    filing.file(entry, place, via).then(ok => {
      if (!ok) return;
      const next = nextInboxRow(input.order, filed);
      log(`inbox next ${next ? 'shown' : 'none'}`);
      if (next) input.select(next);
      else input.close();
    });
  };
  return {
    caption,
    title: entry.kind === 'task' ? displayTaskText(entry.task, 'quiet') : meetingDisplayTitle(entry.meeting),
    done: entry.kind === 'task' ? entry.task.done : null,
    suggestions,
    onFile: place => file(place, 'suggested'),
    onMore: input.onMore,
    onNewProject: entry.kind === 'task' ? input.onNewProject : undefined,
    onToggleDone: input.todoCard?.onToggleDone,
    onEdit: input.todoCard?.onEdit ?? input.meetingCard?.onEdit ?? (() => undefined),
    onDelete: input.todoCard?.onDelete ?? input.meetingCard?.onCancelMeeting ?? (() => undefined),
    onClose: input.close,
  };
}

/** The Inbox entry of a selected row, or null when it isn't the Inbox's. */
export function inboxEntryOf(
  task: {item: {kind: string}; taskIndex: number; task: Task} | null,
  meeting: {item: {kind: string}; meetingIndex: number; meeting: Meeting} | null,
): InboxEntry | null {
  if (task && task.item.kind === 'inbox') return {kind: 'task', index: task.taskIndex, task: task.task};
  if (meeting && meeting.item.kind === 'inbox') return {kind: 'meeting', index: meeting.meetingIndex, meeting: meeting.meeting};
  return null;
}
