/**
 * Daily's Quick Add zone (docs/dev/history/technical-design-calmer-screens.md
 * §3.1.3): Quick Add, or the selected row's card in its place, and below it
 * the selected meeting's context panel in the list's place
 * (docs/dev/history/technical-design-time-and-place.md §3.2) or `list`.
 *
 * The only part of Daily that reads the selection (ui/selectionStore.ts
 * `useSelection`): a tap on a row re-renders this zone and the rows whose mark
 * changes, not the screen or its lists. `list` is the memoized todos list
 * DailyView renders; it stays the same element while only the selection
 * changes.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Keyboard, View} from 'react-native';
import {AbbrevFileMatch} from '../../domain/abbrev';
import {Destination} from '../../domain/destination';
import {GtdParaSettings, ResolvedParaPaths} from '../../domain/settings';
import {displayTaskText} from '../../domain/taskLabels';
import {CachedItem} from '../../storage/dataCache';
import {DailyAggregate, DailyItemRef} from '../../storage/dailyAggregate';
import {linkedFileStatus} from '../../storage/linkedFiles';
import {ProjectFileState} from '../../storage/projectFile';
import {common} from '../../ui/commonStyles';
import {useMeetingCard} from '../../ui/itemCard/useMeetingCard';
import {useTodoCard} from '../../ui/itemCard/useTodoCard';
import MeetingContextPanel from '../../ui/meetingContext/MeetingContextPanel';
import {useMeetingContextSlot} from '../../ui/meetingContext/useMeetingContextSlot';
import QuickAddWidget, {editTargetFor, MeetingQuickAddFields, QuickFilePayload} from '../../ui/QuickAddWidget';
import {useSelection} from '../../ui/selectionStore';
import {EntryActions} from '../../ui/useEntryActions';
import {useStableCallback} from '../../ui/useStableCallback';
import {usePerfRender} from '../../utils/perf';
import {meetingKey, taskKey} from './dailyRows';

const FIXED_INBOX_DESTINATION: Destination = {type: 'inbox'};

interface Props {
  /** ui/useEntryActions.ts with `readSelection: false`: this zone reads `actions.edit.store`. */
  actions: EntryActions;
  aggregate: DailyAggregate | null;
  items: CachedItem[];
  inbox: ProjectFileState | null;
  inboxPath: string | null;
  paths: ResolvedParaPaths | null;
  settings: GtdParaSettings | null;
  /** The day Quick Add's meeting form starts on (the calendar tab's day). */
  initialDate: string;
  /** Whether a meeting on that date shows in the day panel (Quick Add's "where did it go" note). */
  isMeetingDateVisible: (date: string) => boolean;
  openItem: (item: DailyItemRef) => void;
  onOpenOwner: (path: string) => void;
  /** The list under the box while no meeting's context panel replaces it. */
  list: React.ReactNode;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function SelectionZone({
  actions,
  aggregate,
  items,
  inbox,
  inboxPath,
  paths,
  settings,
  initialDate,
  isMeetingDateVisible,
  openItem,
  onOpenOwner,
  list,
  textColor,
  borderColor,
  placeholderColor,
}: Props): React.JSX.Element {
  usePerfRender('SelectionZone');
  const {target: editTarget, mode: editMode} = useSelection(actions.edit.store);
  const {cancel: cancelEditTarget, flushEditRef} = actions.edit;

  // The rows open in Quick Add, looked up in the unfiltered aggregate.
  const editingTaskEntry = editTarget?.type === 'task' ? (aggregate?.tasks ?? []).find(e => taskKey(e) === editTarget.key) ?? null : null;
  const editingMeetingEntry = editTarget?.type === 'meeting' ? (aggregate?.meetings ?? []).find(e => meetingKey(e) === editTarget.key) ?? null : null;
  // Quick-file needs the edited row's real location: this screen's fixedDestination is always the Inbox.
  const editingEntryItem = editingTaskEntry?.item ?? editingMeetingEntry?.item ?? null;
  const editingItemPath = editingEntryItem && editingEntryItem.kind !== 'inbox' ? editingEntryItem.path : null;

  // The selected meeting's context panel and its Quick Add (docs/dev/history/technical-design-time-and-place.md §3.2).
  const context = useMeetingContextSlot(editingMeetingEntry, {items, inbox, inboxPath, settings}, editMode, actions, FIXED_INBOX_DESTINATION, actions.edit.toCard);

  const todoCard = useTodoCard(
    actions.todoCardOptions(editingTaskEntry, {
      onOpenOwner: () => {
        if (editingTaskEntry) openItem(editingTaskEntry.item);
      },
    }),
  );
  const meetingCard = useMeetingCard(
    actions.cardOptions(editingMeetingEntry, {
      onOpenOwner: () => {
        if (editingMeetingEntry) openItem(editingMeetingEntry.item);
      },
    }),
  );

  // Daily is read-only for linked files: a filled clip opens it, nothing links one from here.
  const editingLinkedFile = (editingTaskEntry?.task ?? editingMeetingEntry?.meeting)?.linkedFile;
  const [linkedFileMissing, setLinkedFileMissing] = useState(false);
  useEffect(() => {
    if (!editingLinkedFile || !paths) {
      setLinkedFileMissing(false);
      return;
    }
    let cancelled = false;
    linkedFileStatus(paths, editingLinkedFile).then(status => {
      if (!cancelled) setLinkedFileMissing(status === 'missing');
    });
    return () => {
      cancelled = true;
    };
  }, [editingLinkedFile, paths]);

  /** Quick Add's "Save to <Name>" in edit mode: save, then move the row to the abbreviation's item. */
  const handleQuickFileEdit = async (target: AbbrevFileMatch, payload: QuickFilePayload): Promise<void> => {
    if (editingTaskEntry && payload.kind === 'task') await actions.quickFile({task: editingTaskEntry}, target, payload);
    else if (editingMeetingEntry && payload.kind === 'meeting') await actions.quickFile({meeting: editingMeetingEntry}, target, payload);
  };

  // Stable props for the memoized QuickAddWidget (render-perf-ab §3 B2): called only from its handlers, never while it renders.
  const stableSaveEditTask = useStableCallback((nextText: string, nextLinkedFile: string) =>
    editingTaskEntry ? actions.commitTaskEdit(editingTaskEntry, nextText, nextLinkedFile) : Promise.resolve(false),
  );
  const stableSaveEditMeeting = useStableCallback((fields: MeetingQuickAddFields, nextLinkedFile: string) => {
    Keyboard.dismiss();
    return editingMeetingEntry ? actions.commitMeetingEdit(editingMeetingEntry, fields, nextLinkedFile) : Promise.resolve(false);
  });
  const stableCancelEdit = useStableCallback(cancelEditTarget);
  const stableQuickFileEdit = useStableCallback(handleQuickFileEdit);
  const editingTaskForWidget = useMemo(
    () => (editingTaskEntry ? {...editingTaskEntry.task, text: displayTaskText(editingTaskEntry.task, 'flat')} : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingTaskEntry?.task, editingTaskEntry?.task.text],
  );

  return (
    <>
      <QuickAddWidget
        thisFileLine
        layoutKey="daily"
        {...context.widget}
        initialDate={initialDate}
        isMeetingDateVisible={isMeetingDateVisible}
        editTarget={editTargetFor(editTarget && `${editTarget.type}:${editTarget.key}`, {task: editingTaskForWidget, meeting: editingMeetingEntry?.meeting}, editMode)}
        meetingCard={meetingCard}
        todoCard={todoCard}
        onSaveEditTask={editingTaskEntry ? stableSaveEditTask : undefined}
        onSaveEditMeeting={editingMeetingEntry ? stableSaveEditMeeting : undefined}
        flushEditRef={flushEditRef}
        onCancelEdit={stableCancelEdit}
        onQuickFile={editTarget ? stableQuickFileEdit : undefined}
        editingItemPath={editingItemPath}
        linkedFileMissing={linkedFileMissing}
        textColor={textColor}
        borderColor={borderColor}
        placeholderColor={placeholderColor}
        {...context.todoOverride}
      />
      <View style={[common.divider, {backgroundColor: borderColor}]} />
      {context.model && context.entry ? (
        <MeetingContextPanel
          model={context.model}
          meeting={context.entry.meeting}
          adding={context.adding}
          onQuickAdd={actions.edit.add}
          onBackToCard={actions.edit.toCard}
          onClose={cancelEditTarget}
          actions={context.todoActions}
          selectedTodoKey={context.selectedTodoKey}
          onSelectTodo={context.onSelectTodo}
          onOpenItem={onOpenOwner}
          textColor={textColor}
          borderColor={borderColor}
        />
      ) : (
        list
      )}
    </>
  );
}
