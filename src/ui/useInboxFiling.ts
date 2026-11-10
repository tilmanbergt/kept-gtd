/**
 * Gives an Inbox todo or meeting its place (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): moves it with storage/entryMove.ts (its note along, after the usual
 * confirm), records the place as recently used, and says so in the status
 * slot with Undo - which moves it back to the Inbox the same way. Resolves
 * true when the item moved. Logs only how the place was chosen.
 */
import {useCallback} from 'react';
import {FileToItem} from '../domain/captureFileTo';
import {inboxFiledText, INBOX_FILE_UNDONE_TEXT} from '../domain/fileChangeText';
import {meetingDisplayTitle} from '../domain/meetingTracking';
import {displayTaskText} from '../domain/taskLabels';
import {serializeMeetingLine, serializeTaskLine} from '../domain/markdown';
import {Meeting, Task} from '../domain/types';
import {findCachedItem, getCachedInbox, setCachedInbox} from '../storage/dataCache';
import {mutateEntryTasks} from '../storage/itemMutations';
import {withTaskCancelled} from '../domain/taskEdit';
import {recordDestinationUsed} from '../storage/destinationUsage';
import {itemTarget, moveMeeting, moveTask} from '../storage/entryMove';
import {errorMessage} from '../utils/errorMessage';
import {log, logError} from '../utils/log';
import {requestEinkRefresh} from '../utils/screenRefresh';
import {useStatusApi} from './status/StatusProvider';
import {useActionError} from './useActionError';
import {useEntryMoveUi} from './useEntryMoveUi';

export type InboxEntry = {kind: 'task'; index: number; task: Task} | {kind: 'meeting'; index: number; meeting: Meeting};
export type FileVia = 'suggested' | 'picker' | 'new-project';

export function useInboxFiling(name: string, inboxPath: string | null) {
  const moveUi = useEntryMoveUi(`${name}.inboxFile`);
  const status = useStatusApi();
  const action = useActionError(`${name}.inboxFileError`, `${name}: filing failed`);
  const statusId = `${name}.inboxFiled`;

  const undo = useCallback(
    async (moved: InboxEntry, place: FileToItem) => {
      status.clear(statusId);
      await action.run(async () => {
        const owner = findCachedItem(place.path);
        const list: Array<Task | Meeting> = moved.kind === 'task' ? owner?.tasks ?? [] : owner?.meetings ?? [];
        // Appended by the move: the last entry whose whole line is the one written (text, tags and
        // fields - a later entry with only the same text or title is not it). Lines identical in
        // every part are the same item to the file, so either one goes back.
        const line = (e: Task | Meeting) => (moved.kind === 'task' ? serializeTaskLine(e as Task) : serializeMeetingLine(e as Meeting));
        const written = moved.kind === 'task' ? serializeTaskLine(moved.task) : serializeMeetingLine(moved.meeting);
        const at = list.map(line).lastIndexOf(written);
        if (at < 0) throw new Error('It changed in the meantime - it stays where it is.');
        const source = {kind: place.kind, path: place.path};
        const back = moved.kind === 'task' ? await moveTask(source, at, list[at] as Task, {type: 'inbox'}, moveUi) : await moveMeeting(source, at, list[at] as Meeting, {type: 'inbox'}, moveUi);
        if (back) {
          log('inbox file undone');
          status.show(statusId, {kind: 'success', text: INBOX_FILE_UNDONE_TEXT, onDismiss: () => status.clear(statusId)});
          requestEinkRefresh();
        }
      });
    },
    [action, moveUi, status, statusId],
  );

  const file = useCallback(
    async (entry: InboxEntry, place: FileToItem, via: FileVia, options: {quiet?: boolean} = {}): Promise<boolean> => {
      if (!inboxPath) return false;
      let moved: InboxEntry | null = null;
      await action.run(async () => {
        const source = {kind: 'inbox' as const, path: inboxPath};
        const target = itemTarget(place);
        if (entry.kind === 'task') {
          const written = await moveTask(source, entry.index, entry.task, target, moveUi);
          if (written) moved = {kind: 'task', index: -1, task: written};
        } else {
          const written = await moveMeeting(source, entry.index, entry.meeting, target, moveUi);
          if (written) moved = {kind: 'meeting', index: -1, meeting: written};
        }
      });
      const done = moved as InboxEntry | null;
      if (!done) return false;
      log(`inbox file to=${via}`);
      recordDestinationUsed(place.path).catch(e => logError(`${name}: recording the place failed`, errorMessage(e)));
      // A new project says so itself (with Open ›).
      if (options.quiet) return true;
      const title = done.kind === 'task' ? displayTaskText(done.task, 'flat') : meetingDisplayTitle(done.meeting);
      status.show(statusId, {
        kind: 'success',
        text: inboxFiledText(title, place.name),
        actions: [{label: 'Undo', onPress: () => undo(done, place)}],
        onDismiss: () => status.clear(statusId),
      });
      requestEinkRefresh();
      return true;
    },
    [action, inboxPath, moveUi, name, status, statusId, undo],
  );

  /** "Was only the name: remove it" (a new project from the todo): the todo cancelled, as Delete does; it stays in the file. */
  const cancelTodo = useCallback(
    async (index: number, task: Task): Promise<boolean> =>
      inboxPath === null
        ? false
        : action.runSave(async () => {
            const inbox = getCachedInbox();
            const {nextInbox} = await mutateEntryTasks(
              {item: {kind: 'inbox', path: inboxPath}, taskIndex: index, task},
              tasks => tasks.map((t, i) => (i === index ? withTaskCancelled(t, true) : t)),
              {inbox, inboxPath},
            );
            if (nextInbox) setCachedInbox(nextInbox);
            log('inbox todo removed for a new project');
          }),
    [action, inboxPath],
  );

  return {file, cancelTodo, statusId};
}
