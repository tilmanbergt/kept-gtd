/**
 * Review step "Inbox to zero" (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): the same parts as Daily's Inbox tab. On the left the Inbox as one
 * list (screens/daily/InboxList.tsx: the marks card, the open todos, the
 * meetings - past ones too); on the right Quick Add with the selected item's
 * Inbox card (File to, More…, → New project, Done, Edit, Delete) and, in the
 * list's place, the picker or the new-project form. Filing is by the card
 * and the picker; each item that leaves the Inbox counts for the recap.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Text, View} from 'react-native';
import {AbbrevFileMatch} from '../../../domain/abbrev';
import {Destination, destinationLabel} from '../../../domain/destination';
import {inboxSummary, InboxListEntry, isOpenInboxTodo} from '../../../domain/inboxCount';
import {todayIso} from '../../../domain/meetingTime';
import {displayTaskText} from '../../../domain/taskLabels';
import {withTaskCancelled, withTaskDone} from '../../../domain/taskEdit';
import {Meeting, Task} from '../../../domain/types';
import {DailyMeetingEntry, DailyTaskEntry, inboxItemRef} from '../../../storage/dailyAggregate';
import {setCachedInbox} from '../../../storage/dataCache';
import {itemTarget, moveMeeting, moveTask} from '../../../storage/entryMove';
import {addMeetingToDestination, applyMeetingEdit, applyTaskEdit, buildMeeting, mutateEntryMeetings, mutateEntryTasks} from '../../../storage/itemMutations';
import {openLinkedFile} from '../../../storage/linkedFiles';
import {openOrCreateMeetingNote, openOrCreateTodoNote} from '../../../storage/meetingNoteContent';
import {ProjectFileState} from '../../../storage/projectFile';
import {loadSettings} from '../../../storage/settingsStorage';
import {common} from '../../../ui/commonStyles';
import InboxCard from '../../../ui/itemCard/InboxCard';
import {useMeetingCard} from '../../../ui/itemCard/useMeetingCard';
import {useTodoCard} from '../../../ui/itemCard/useTodoCard';
import MeetingRow, {trackingSetups} from '../../../ui/MeetingRow';
import QuickAddWidget, {editTargetFor, MeetingQuickAddFields, QuickFilePayload} from '../../../ui/QuickAddWidget';
import {estimatorWidth} from '../../../ui/ScreenSize';
import TaskRow, {taskRowLines} from '../../../ui/TaskRow';
import {useActionError} from '../../../ui/useActionError';
import {useEditTarget} from '../../../ui/useEditTarget';
import {useEntryMoveUi} from '../../../ui/useEntryMoveUi';
import {useNoteCreateConfirm} from '../../../ui/useNoteCreateConfirm';
import {useOpenMarks} from '../../../ui/useOpenMarks';
import {errorMessage} from '../../../utils/errorMessage';
import {log, logError} from '../../../utils/log';
import FilePicker from '../../daily/FilePicker';
import InboxList, {ALL_MARKS, inboxRows} from '../../daily/InboxList';
import NewProjectForm from '../../daily/NewProjectForm';
import {existingAbbrevs, pickerPlaces, useInboxCard} from '../../daily/useInboxCard';
import {styles} from '../reviewStyles';
import {FIXED_INBOX_DESTINATION, ReviewStepProps} from '../shared';
import {bump} from '../reviewVisit';

const INBOX_NOT_LOADED = 'Inbox not loaded yet - Settings → Advanced → Reload all files.';
const INBOX_ITEM_CHANGED = 'That inbox item changed on disk - Settings → Advanced → Reload all files.';

type InboxEditTarget = {type: 'task' | 'meeting'; index: number};

/** What the step lists and the hub counts (domain/inboxCount.ts): open todos, meetings past ones included, marks. */
export function inboxStepCount(inbox: ProjectFileState | null, openMarks: number): number {
  return inbox ? inboxSummary(inbox.tasks, inbox.meetings, openMarks, todayIso()).count : openMarks;
}

export default function InboxStep({data, onOpenItem, onAddTask, textColor, borderColor, placeholderColor}: ReviewStepProps): React.JSX.Element {
  const {settings, inbox, inboxPath, paths, items, refreshFromCache} = data;
  const action = useActionError('ReviewScreen.inboxActionError', 'ReviewScreen: inbox action failed');
  const confirmNoteCreate = useNoteCreateConfirm('ReviewScreen.noteCreateConfirm');
  const moveUi = useEntryMoveUi('ReviewScreen');
  const edit = useEditTarget<InboxEditTarget>('Review');
  const {target: editTarget, mode: editMode, cancel: cancelEditTarget, flushEditRef, store: selection} = edit;
  const openMarks = useOpenMarks(ALL_MARKS).length;

  const inboxContext = () => {
    if (!inbox || !inboxPath) throw new Error(INBOX_NOT_LOADED);
    return {inbox, inboxPath, source: {kind: 'inbox' as const, path: inboxPath}};
  };
  const changeTask = async (index: number, change: (task: Task) => Task): Promise<void> => {
    const ctx = inboxContext();
    const task = ctx.inbox.tasks[index];
    if (!task) throw new Error(INBOX_ITEM_CHANGED);
    const {nextInbox} = await mutateEntryTasks({item: ctx.source, taskIndex: index, task}, tasks => tasks.map((t, i) => (i === index ? change(t) : t)), ctx);
    if (nextInbox) setCachedInbox(nextInbox);
  };
  const changeMeeting = async (index: number, change: (meeting: Meeting) => Meeting): Promise<void> => {
    const ctx = inboxContext();
    const meeting = ctx.inbox.meetings[index];
    if (!meeting) throw new Error(INBOX_ITEM_CHANGED);
    const {nextInbox} = await mutateEntryMeetings({item: ctx.source, meetingIndex: index, meeting}, meetings => meetings.map((m, i) => (i === index ? change(m) : m)), ctx);
    if (nextInbox) setCachedInbox(nextInbox);
  };

  const toggleDone = (index: number) =>
    action.run(async () => {
      const wasDone = inbox?.tasks[index]?.done ?? false;
      await changeTask(index, t => withTaskDone(t, !t.done, todayIso()));
      if (!wasDone) bump('inboxCleared');
      log('ReviewScreen: inbox task done', index);
    });
  const taskNote = (index: number) =>
    action.run(async () => {
      const {inbox: current, inboxPath: folder} = inboxContext();
      const {task, changed} = await openOrCreateTodoNote(current.tasks[index], folder, settings ?? (await loadSettings()), {tasks: current.tasks}, {
        forceOwnTarget: true,
        confirmCreate: confirmNoteCreate,
      });
      if (changed) await changeTask(index, () => task);
    });
  const meetingNote = (index: number) =>
    action.run(async () => {
      const {inbox: current, inboxPath: folder} = inboxContext();
      const {meeting, changed} = await openOrCreateMeetingNote(current.meetings[index], folder, settings ?? (await loadSettings()), {tasks: current.tasks}, {
        forceOwnTarget: true,
        confirmCreate: confirmNoteCreate,
      });
      if (changed) await changeMeeting(index, () => meeting);
    });
  const openFile = (linkedFile: string) => {
    if (paths) openLinkedFile(paths, linkedFile).catch(e => logError('ReviewScreen: open linked file failed', errorMessage(e)));
  };

  // The Inbox as one list, file order; a todo ticked here stays (struck) until the step is left.
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());
  const lists = useMemo(() => {
    if (!inbox || !inboxPath) return {todos: [] as DailyTaskEntry[], meetings: [] as DailyMeetingEntry[]};
    const item = inboxItemRef(inboxPath);
    const summary = inboxSummary(inbox.tasks, inbox.meetings, openMarks, todayIso());
    return {
      todos: inbox.tasks.map((task, taskIndex): DailyTaskEntry => ({item, taskIndex, task})).filter(e => isOpenInboxTodo(e.task) || ticked.has(e.taskIndex)),
      meetings: summary.meetings.map((meetingIndex): DailyMeetingEntry => ({item, meetingIndex, meeting: inbox.meetings[meetingIndex]})),
    };
  }, [inbox, inboxPath, openMarks, ticked]);
  const rows = useMemo(() => inboxRows(openMarks, lists.todos, lists.meetings), [openMarks, lists]);
  const order: InboxListEntry[] = useMemo(
    () => [...lists.todos.map(e => ({type: 'task' as const, index: e.taskIndex})), ...lists.meetings.map(e => ({type: 'meeting' as const, index: e.meetingIndex}))],
    [lists],
  );

  const editingTask = editTarget?.type === 'task' ? inbox?.tasks[editTarget.index] ?? null : null;
  const editingMeeting = editTarget?.type === 'meeting' ? inbox?.meetings[editTarget.index] ?? null : null;
  const todoIndex = editTarget?.type === 'task' ? editTarget.index : null;
  const meetingIndex = editTarget?.type === 'meeting' ? editTarget.index : null;
  const todoCard = useTodoCard({
    name: 'ReviewInboxStep',
    selection: editingTask && inboxPath ? {task: editingTask, itemPath: inboxPath, ownerName: 'Inbox', inbox: true} : null,
    updateTask: async change => {
      if (todoIndex !== null) await changeTask(todoIndex, change);
    },
    onToggleDone: () => {
      if (todoIndex === null) return;
      setTicked(prev => new Set([...prev, todoIndex]));
      toggleDone(todoIndex);
    },
    onNote: () => todoIndex !== null && taskNote(todoIndex),
    onOpenFile: openFile,
    onEdit: edit.edit,
    onClose: cancelEditTarget,
  });
  const meetingCard = useMeetingCard({
    name: 'ReviewInboxStep',
    selection: editingMeeting && inboxPath ? {meeting: editingMeeting, itemPath: inboxPath, ownerName: 'Inbox', inbox: true} : null,
    settings,
    inbox: inbox ? {tasks: inbox.tasks} : null,
    updateMeeting: async change => {
      if (meetingIndex !== null) await changeMeeting(meetingIndex, change);
    },
    onNote: () => meetingIndex !== null && meetingNote(meetingIndex),
    onOpenFile: openFile,
    onEdit: edit.edit,
    onClose: cancelEditTarget,
  });

  const [panel, setPanel] = useState<'picker' | 'newProject' | null>(null);
  const selectedKey = editTarget ? `${editTarget.type}:${editTarget.index}:${editMode}` : null;
  useEffect(() => setPanel(null), [selectedKey]);
  const entry =
    editMode !== 'card'
      ? null
      : todoIndex !== null && editingTask
        ? {kind: 'task' as const, index: todoIndex, task: editingTask}
        : meetingIndex !== null && editingMeeting
          ? {kind: 'meeting' as const, index: meetingIndex, meeting: editingMeeting}
          : null;
  const inboxCard = useInboxCard({
    name: 'ReviewScreen',
    entry,
    items,
    inboxPath,
    order,
    select: row => {
      setPanel(null);
      edit.set({type: row.type, index: row.index}, 'card');
    },
    close: cancelEditTarget,
    todoCard,
    meetingCard,
    onMore: () => setPanel('picker'),
    onNewProject: () => setPanel('newProject'),
    onOpenProject: path => {
      const owner = items.find(i => i.path === path);
      if (owner) onOpenItem({kind: owner.kind, name: owner.name, path});
    },
    onCleared: () => {
      bump('inboxCleared');
      refreshFromCache();
    },
  });
  const places = useMemo(() => pickerPlaces(items), [items]);

  /** Quick Add's Delete in edit mode: a soft cancel. */
  const deleteEdited = () => {
    if (!editTarget) return;
    const {type, index} = editTarget;
    action.run(async () => {
      if (type === 'task') await changeTask(index, t => withTaskCancelled(t, true));
      else await changeMeeting(index, m => ({...m, cancelled: true}));
      cancelEditTarget();
      bump('inboxCleared');
      log('ReviewScreen: inbox', type, 'cancelled', index);
    });
  };
  /** Save, but file to the abbreviation's Project/Area (Quick Add's edit mode). */
  const quickFileEdit = async (target: AbbrevFileMatch, payload: QuickFilePayload): Promise<void> => {
    if (!editTarget) return;
    const {inbox: current, source} = inboxContext();
    const index = editTarget.index;
    let moved: Task | Meeting | null = null;
    if (editTarget.type === 'task' && payload.kind === 'task') {
      moved = await moveTask(source, index, applyTaskEdit(current.tasks[index] ?? fail(), payload.text, payload.linkedFile), itemTarget(target), moveUi);
    } else if (editTarget.type === 'meeting' && payload.kind === 'meeting') {
      moved = await moveMeeting(source, index, applyMeetingEdit(current.meetings[index] ?? fail(), payload.fields, payload.linkedFile), itemTarget(target), moveUi);
    }
    if (!moved) return;
    refreshFromCache();
    bump('inboxCleared');
    cancelEditTarget();
  };
  const saveTask = (nextText: string, nextLinkedFile: string): Promise<boolean> =>
    action.runSave(async () => {
      if (todoIndex === null) return;
      await changeTask(todoIndex, t => applyTaskEdit(t, nextText, nextLinkedFile));
      edit.saved();
    });
  const saveMeeting = (fields: MeetingQuickAddFields, nextLinkedFile: string): Promise<boolean> =>
    action.runSave(async () => {
      if (meetingIndex === null) return;
      await changeMeeting(meetingIndex, m => applyMeetingEdit(m, fields, nextLinkedFile));
      edit.saved();
    });
  const addMeeting = async (fields: MeetingQuickAddFields, destination: Destination): Promise<void> => {
    const {nextInbox} = await addMeetingToDestination(buildMeeting(fields), destination, {inbox, inboxPath});
    if (nextInbox) setCachedInbox(nextInbox);
    else refreshFromCache();
    log('ReviewScreen: added meeting', destinationLabel(destination));
  };

  const tracking = {setups: trackingSetups(settings)};
  const renderTodo = (e: DailyTaskEntry, heightPx: number) => (
    <TaskRow
      key={`task-${e.taskIndex}`}
      task={e.task}
      selection={{store: selection, key: `task:${e.taskIndex}`}}
      onStartEdit={() => edit.select({type: 'task', index: e.taskIndex})}
      onToggleDone={() => {
        if (!e.task.done) setTicked(prev => new Set([...prev, e.taskIndex]));
        toggleDone(e.taskIndex);
      }}
      onCreateNote={() => taskNote(e.taskIndex)}
      onOpenNote={() => taskNote(e.taskIndex)}
      linkedFile={e.task.linkedFile}
      onOpenLinkedFile={openFile}
      ownerPath={inboxPath}
      context="inbox"
      height={heightPx}
      numberOfLines={taskRowLines(e.task, estimatorWidth(), 'inbox')}
      textColor={textColor}
      borderColor={borderColor}
    />
  );
  const renderMeeting = (e: DailyMeetingEntry) => (
    <MeetingRow
      key={`meeting-${e.meetingIndex}`}
      meeting={e.meeting}
      ownerPath={inboxPath}
      layout="oneLine"
      time="dateTime"
      tracking={tracking}
      note={{onOpen: () => meetingNote(e.meetingIndex), onCreate: () => meetingNote(e.meetingIndex)}}
      noteOnlyWhenExists
      file={{linkedFile: e.meeting.linkedFile, onOpen: openFile}}
      onPress={() => edit.select({type: 'meeting', index: e.meetingIndex})}
      selection={{store: selection, key: `meeting:${e.meetingIndex}`}}
      textColor={textColor}
      borderColor={borderColor}
    />
  );

  return (
    <View style={styles.body}>
      <View style={[styles.leftPane, {borderColor}]}>
        <Text style={[styles.paneTitle, {color: textColor}]}>Inbox</Text>
        <InboxList rows={rows} renderTodo={renderTodo} renderMeeting={renderMeeting} marksReturnTo="review" heightKey="review:inbox" textColor={textColor} borderColor={borderColor} />
      </View>
      <View style={styles.rightPane}>
        <Text style={[common.hint, {color: textColor}]}>Give every item a place: file it, finish it, or let it go.</Text>
        <QuickAddWidget
          collapsible
          fixedDestination={FIXED_INBOX_DESTINATION}
          onAddTask={onAddTask}
          onAddMeeting={addMeeting}
          editTarget={editTargetFor(
            editTarget ? `${editTarget.type}:${editTarget.index}` : null,
            {task: editingTask ? {...editingTask, text: displayTaskText(editingTask, 'flat')} : null, meeting: editingMeeting},
            editMode,
          )}
          meetingCard={meetingCard}
          todoCard={todoCard}
          cardOverride={inboxCard ? <InboxCard card={inboxCard.card} textColor={textColor} borderColor={borderColor} /> : undefined}
          onSaveEditTask={todoIndex !== null ? saveTask : undefined}
          onSaveEditMeeting={meetingIndex !== null ? saveMeeting : undefined}
          flushEditRef={flushEditRef}
          onCancelEdit={cancelEditTarget}
          onDeleteEdit={deleteEdited}
          onQuickFile={editTarget ? quickFileEdit : undefined}
          textColor={textColor}
          borderColor={borderColor}
          placeholderColor={placeholderColor}
        />
        <View style={[common.divider, {backgroundColor: borderColor}]} />
        {inboxCard && panel === 'picker' ? (
          <FilePicker
            places={places}
            onPick={inboxCard.fileTo}
            onBack={() => setPanel(null)}
            onNewProject={entry?.kind === 'task' ? () => setPanel('newProject') : undefined}
            onSomeday={entry?.kind === 'task' ? inboxCard.someday : undefined}
            textColor={textColor}
            borderColor={borderColor}
          />
        ) : inboxCard && panel === 'newProject' && entry?.kind === 'task' ? (
          <NewProjectForm
            itemText={inboxCard.card.title}
            existingAbbrevs={existingAbbrevs(items)}
            onCreate={inboxCard.createProject}
            onBack={() => setPanel(null)}
            textColor={textColor}
            borderColor={borderColor}
            placeholderColor={placeholderColor}
          />
        ) : null}
      </View>
    </View>
  );
}

function fail(): never {
  throw new Error(INBOX_ITEM_CHANGED);
}
