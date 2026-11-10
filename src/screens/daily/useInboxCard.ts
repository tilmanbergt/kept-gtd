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
import {ExistingAbbrev} from '../../domain/abbrev';
import {PickerPlace} from './FilePicker';
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
import {errorMessage} from '../../utils/errorMessage';
import {log, logError} from '../../utils/log';
import {setFlowStateTag} from '../../domain/flowState';
import {newProjectText} from '../../domain/fileChangeText';
import {NewProjectTodo} from '../../domain/projectFromItem';
import {withTaskText} from '../../domain/taskEdit';
import {createProjectWithAbbrev} from '../../storage/createItem';
import {recordDestinationUsed} from '../../storage/destinationUsage';
import {loadSettings} from '../../storage/settingsStorage';
import {useStatusApi} from '../../ui/status/StatusProvider';
import {useActionError} from '../../ui/useActionError';

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
  /** Open › on the new project's status line. */
  onOpenProject?: (path: string) => void;
}

export interface InboxCardApi {
  card: InboxCardData;
  /** Files to a place picked from More… (screens/daily/FilePicker.tsx). */
  fileTo: (place: FileToItem) => void;
  /** Someday / Maybe: `#someday`; it stays in the Inbox file and leaves the Inbox list. */
  someday: () => void;
  /** New project (screens/daily/NewProjectForm.tsx): resolves false when nothing was created. */
  createProject: (form: {name: string; abbrev: string; todo: NewProjectTodo}) => Promise<boolean>;
}

export function useInboxCard(input: Input): InboxCardApi | null {
  const filing = useInboxFiling(input.name, input.inboxPath);
  const status = useStatusApi();
  const action = useActionError(`${input.name}.newProject`, `${input.name}: new project failed`);
  const {entry} = input;
  if (!entry) return null;
  const today = todayIso();
  const tags = entry.kind === 'task' ? entry.task.tags : entry.meeting.tags;
  const places = input.items.filter((i): i is CachedItem & FileToItem => i.kind === 'project' || i.kind === 'area');
  const suggestions = inboxFileTo({tags, places, tagOwners: tagOwners(input.items), recent: getRecentDestinationsSync() ?? []});
  const created = entry.kind === 'task' ? entry.task.fields.created : null;
  const caption = entry.kind === 'task' ? (created ? `Inbox · captured ${formatDate(created, today)}` : 'Inbox') : `Inbox · ${formatDayHeader(entry.meeting.date, today)}`;
  const filed: InboxListEntry = {type: entry.kind, index: entry.index};
  /** The next Inbox row's card, or the collapsed box. */
  const showNext = (moved: boolean) => {
    const next = nextInboxRow(input.order, filed, moved);
    log(`inbox next ${next ? 'shown' : 'none'}`);
    if (next) input.select(next);
    else input.close();
  };
  const file = (place: FileToItem, via: FileVia) => {
    filing.file(entry, place, via).then(ok => ok && showNext(true));
  };
  const createProject = async (form: {name: string; abbrev: string; todo: NewProjectTodo}): Promise<boolean> => {
    if (entry.kind !== 'task') return false;
    let project: CachedItem | null = null;
    const ok = await action.runSave(async () => {
      project = await createProjectWithAbbrev(form.name, form.abbrev, await loadSettings());
    });
    const made = project as CachedItem | null;
    if (!ok || !made) return false;
    const place = {kind: 'project' as const, name: made.name, path: made.path, abbrev: made.abbrev, status: made.status};
    const moved =
      form.todo === 'remove'
        ? await filing.cancelTodo(entry.index, entry.task)
        : await filing.file(
            {kind: 'task', index: entry.index, task: withTaskText(entry.task, setFlowStateTag(entry.task.text, form.todo === 'next' ? 'next' : null))},
            place,
            'new-project',
            {quiet: true},
          );
    if (form.todo === 'remove') recordDestinationUsed(made.path).catch(e => logError(`${input.name}: recording the place failed`, errorMessage(e)));
    status.show(filing.statusId, {
      kind: 'success',
      text: newProjectText(made.name, made.abbrev, made.path),
      actions: [{label: 'Open ›', onPress: () => input.onOpenProject?.(made.path)}],
      onDismiss: () => status.clear(filing.statusId),
    });
    if (moved) showNext(form.todo !== 'remove');
    return true;
  };
  return {
    card: {
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
    },
    fileTo: place => file(place, 'picker'),
    someday: () => {
      if (entry.kind !== 'task' || !input.todoCard) return;
      if (entry.task.flowState !== 'someday') input.todoCard.onFlow('someday');
      log('inbox someday');
      showNext(false);
    },
    createProject,
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

/** Every Project and Area for the picker, a project with its area's name. */
export function pickerPlaces(items: readonly CachedItem[]): PickerPlace[] {
  return items
    .filter(i => i.kind === 'project' || i.kind === 'area')
    .map(i => ({kind: i.kind as 'project' | 'area', name: i.name, path: i.path, abbrev: i.abbrev, status: i.status, area: i.kind === 'project' ? i.area : null}));
}

/** The abbreviations in use, for a new one's check. */
export function existingAbbrevs(items: readonly CachedItem[]): ExistingAbbrev[] {
  return items.filter((i): i is CachedItem & {abbrev: string} => i.abbrev !== null).map(i => ({value: i.abbrev, itemName: i.name}));
}
