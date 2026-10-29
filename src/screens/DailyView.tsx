/**
 * Daily (design-overview.md §2.7, docs/dev/history/technical-design-daily-slim.md §3.1):
 * two columns under the display-mode row (screens/daily/DailyModeRow.tsx).
 *
 * - Left: the day panel (ui/DayMeetingsPanel.tsx: Today | Tomorrow | Google),
 *   the whole column.
 * - Right (screens/daily/DailyTodosColumn.tsx): one Quick Add, always to the
 *   Inbox (docs/dev/history/technical-design-filing-unification.md §6), above
 *   the Next todos grouped by owner. A selected row's card takes Quick Add's
 *   place (ui/useEditTarget.ts: first tap card, second tap edit). A selected
 *   meeting or focus block shows its context panel (ui/meetingContext/) in the
 *   Next todos' place; "+ Quick Add to meeting" turns the card's slot into
 *   Quick Add for it (`add` mode) until the add or "‹ Back to the card".
 *
 * What shows is storage/dailyAggregate.ts's rule over the cache and the
 * Inbox (screens/daily/useDailyData.ts). Every write goes through
 * ui/useEntryActions.ts, the path the overviews use too; rows can belong to
 * different Projects/Areas or the Inbox, so each action re-reads its entry's
 * own source. The tag filter (technical-design-context-tags.md §6) is set by
 * tapping a plain tag in a row and is screen state only.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Keyboard, StyleSheet, View} from 'react-native';
import {AbbrevFileMatch} from '../domain/abbrev';
import {Destination} from '../domain/destination';
import {displayTaskText} from '../domain/taskLabels';
import {
  buildDailyAggregate,
  dailyEntryDate,
  DailyAggregate,
  DailyItemRef,
  DailyMeetingEntry,
  DailyTaskEntry,
  groupDailyTasksByItem,
} from '../storage/dailyAggregate';
import {linkedFileStatus} from '../storage/linkedFiles';
import {FolderEntry} from '../supernote/fileSystem';
import {usePerfRender} from '../utils/perf';
import GoogleCalendarPanel from '../ui/GoogleCalendarPanel';
import {useFeatures} from '../ui/featureStore';
import MeetingRow, {MeetingRowLayout} from '../ui/MeetingRow';
import DayMeetingsPanel from '../ui/DayMeetingsPanel';
import {MiniTabDef} from '../ui/MiniTabs';
import QuickAddWidget, {editTargetFor, MeetingQuickAddFields, QuickFilePayload} from '../ui/QuickAddWidget';
import TaskRow, {taskRowLines} from '../ui/TaskRow';
import {common} from '../ui/commonStyles';
import LoadErrorNotice from '../ui/LoadErrorNotice';
import {useThemeColors} from '../ui/theme';
import {useStableCallback} from '../ui/useStableCallback';
import {useEntryActions} from '../ui/useEntryActions';
import {cardOrEdit} from '../ui/useEditTarget';
import MeetingContextPanel from '../ui/meetingContext/MeetingContextPanel';
import {useMeetingContextSlot} from '../ui/meetingContext/useMeetingContextSlot';
import {tallyHidden} from '../domain/contexts';
import HiddenLine from '../ui/context/HiddenLine';
import {useContextMatcher} from '../ui/context/useContextMatcher';
import {useMeetingCard} from '../ui/itemCard/useMeetingCard';
import {useTodoCard} from '../ui/itemCard/useTodoCard';
import DailyModeRow from './daily/DailyModeRow';
import DailyTodosColumn from './daily/DailyTodosColumn';
import {COLUMN_WIDTH_PX, flattenTaskGroups, FlatTaskRow, meetingKey, taskKey} from './daily/dailyRows';
import {useDailyData} from './daily/useDailyData';

interface Props {
  onOpenItem: (kind: 'project' | 'area', entry: FolderEntry) => void;
  /** Switches to the Inbox tab: an Inbox row's group header or source has no Project/Area to open. */
  onOpenInbox?: () => void;
  /** Switches to Settings → Calendar (the Google tab's empty state). */
  onOpenCalendarSettings?: () => void;
}

const FIXED_INBOX_DESTINATION: Destination = {type: 'inbox'};

type CalendarTab = 'today' | 'tomorrow' | 'google';
const CALENDAR_TABS: MiniTabDef<CalendarTab>[] = [
  {key: 'today', label: 'Today'},
  {key: 'tomorrow', label: 'Tomorrow'},
  {key: 'google', label: 'Google'},
];

/** Stable empty fallback (docs/dev/history/technical-design-render-perf-ab.md §3 B4). */
const EMPTY_DAILY_AGGREGATE: DailyAggregate = {tasks: [], meetings: [], failedItems: []};

export default function DailyView({onOpenItem, onOpenInbox, onOpenCalendarSettings}: Props): React.JSX.Element {
  usePerfRender('DailyView');
  const {textColor, borderColor, placeholderColor} = useThemeColors();
  const data = useDailyData('DailyView');
  const {items, inbox, inboxPath, paths, settings, todayDate, tomorrowDate} = data;
  const actions = useEntryActions('DailyView', {hiddenNotice: true});
  const {target: editTarget, mode: editMode, select: selectEditTarget, cancel: cancelEditTarget, flushEditRef} = actions.edit;
  const cardMode = cardOrEdit(editMode);
  const features = useFeatures();
  const [calendarTab, setCalendarTab] = useState<CalendarTab>('today');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const toggleTagFilter = (tag: string) => setTagFilter(current => (current === tag ? null : tag));

  const openItem = (item: DailyItemRef) => {
    if (item.kind === 'inbox') {
      onOpenInbox?.();
      return;
    }
    onOpenItem(item.kind, {name: item.name, path: item.path, isFolder: true});
  };

  const inboxInput = inbox ? {tasks: inbox.tasks, meetings: inbox.meetings} : null;
  // The active context hides todos and dims meetings (docs/dev/history/technical-design-time-and-place.md §3.3); the tag filter applies on top.
  const contextFilter = useContextMatcher();
  const {matcher} = contextFilter;
  // Recomputed after midnight through todayDate (render-perf-ab §3 B4).
  const aggregate: DailyAggregate | null = useMemo(
    () => (inboxPath !== null ? buildDailyAggregate(items, inboxInput, inboxPath, new Date(), null, matcher) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayDate: recompute after midnight
    [items, inbox, inboxPath, todayDate, matcher],
  );
  const displayAggregate: DailyAggregate = useMemo(
    () => (tagFilter ? buildDailyAggregate(items, inboxInput, inboxPath ?? '', new Date(), tagFilter, matcher) : aggregate ?? EMPTY_DAILY_AGGREGATE),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayDate: recompute after midnight
    [tagFilter, items, inbox, inboxPath, aggregate, todayDate, matcher],
  );
  const hiddenText = contextFilter.lineText(tallyHidden(displayAggregate.hiddenTasks ?? [], contextFilter.kinds, todayDate));

  // dailyEntryDate: a multi-day meeting is listed on each day it covers.
  const meetingsToday = displayAggregate.meetings.filter(entry => dailyEntryDate(entry) === todayDate);
  const meetingsTomorrow = displayAggregate.meetings.filter(entry => dailyEntryDate(entry) === tomorrowDate);
  const taskRows = flattenTaskGroups(groupDailyTasksByItem(displayAggregate.tasks));

  // The rows open in Quick Add, looked up in the unfiltered aggregate each render.
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

  const renderTaskEntry = (entry: DailyTaskEntry, heightPx: number) => {
    const key = taskKey(entry);
    return (
      <TaskRow
        key={key}
        task={entry.task}
        isEditing={editTarget?.type === 'task' && editTarget.key === key}
        onStartEdit={() => selectEditTarget({type: 'task', key})}
        onToggleDone={() => actions.toggleDone(entry)}
        onCreateNote={() => actions.taskNote(entry)}
        onOpenNote={() => actions.taskNote(entry)}
        linkedFile={entry.task.linkedFile}
        onOpenLinkedFile={actions.openFile}
        contextTag={tagFilter}
        onToggleContext={toggleTagFilter}
        ownerPath={entry.item.path}
        context="flat"
        height={heightPx}
        numberOfLines={taskRowLines(entry.task, COLUMN_WIDTH_PX, 'flat', tagFilter != null)}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  };

  // The standard meeting row (docs/dev/history/technical-design-meeting-lists.md §3): source, read-only M, tracking, note, linked file.
  const renderMeetingEntry = (entry: DailyMeetingEntry, layout: MeetingRowLayout) => {
    const key = meetingKey(entry);
    return (
      <MeetingRow
        key={`${key}@${entry.span?.date ?? ''}`}
        meeting={entry.meeting}
        span={entry.span}
        layout={layout}
        time="time"
        source={{abbrev: entry.item.abbrev ?? entry.item.name, name: entry.item.name, onPress: () => openItem(entry.item)}}
        highlight="mark"
        tracking={actions.tracking()}
        note={{onOpen: () => actions.meetingNote(entry), onCreate: () => actions.meetingNote(entry)}}
        file={{linkedFile: entry.meeting.linkedFile, onOpen: actions.openFile}}
        onPress={() => selectEditTarget({type: 'meeting', key})}
        dimmed={entry.contextState === 'dimmed'}
        state={editTarget?.type === 'meeting' && editTarget.key === key ? (cardMode === 'card' ? 'selected' : 'editing') : undefined}
        contextTag={tagFilter}
        onToggleContext={toggleTagFilter}
        ownerPath={entry.item.path}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  };

  /** Quick Add's "Save to <Name>" in edit mode: save, then move the row to the abbreviation's item. */
  const handleQuickFileEdit = async (target: AbbrevFileMatch, payload: QuickFilePayload): Promise<void> => {
    if (editingTaskEntry && payload.kind === 'task') await actions.quickFile({task: editingTaskEntry}, target, payload);
    else if (editingMeetingEntry && payload.kind === 'meeting') await actions.quickFile({meeting: editingMeetingEntry}, target, payload);
  };

  // Stable props for the memoized QuickAddWidget (render-perf-ab §3 B2): called only from its handlers, never while it renders.

  const stableIsMeetingDateVisible = useStableCallback((date: string) =>
    calendarTab === 'today' ? date === todayDate : calendarTab === 'tomorrow' ? date === tomorrowDate : false,
  );
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

  const quickAdd = (
    <QuickAddWidget
      thisFileLine
      layoutKey="daily"
      {...context.widget}
      initialDate={calendarTab === 'tomorrow' ? tomorrowDate : todayDate}
      // Only the shown tab's day is in the list; anything else gets the widget's "where did it go" note.
      isMeetingDateVisible={stableIsMeetingDateVisible}
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
  );

  return (
    <View style={common.container}>
      {data.loading && <ActivityIndicator style={common.spacer} />}
      {!data.loading && data.error && <LoadErrorNotice error={data.error} onRetry={data.retry} textColor={textColor} />}
      {!data.loading && !data.error && aggregate && (
        <View style={common.content}>
          <DailyModeRow
            tagFilter={tagFilter}
            onClearTagFilter={() => setTagFilter(null)}
            textColor={textColor}
            borderColor={borderColor}
          />
          <View style={styles.middleRow}>
            <View style={[common.column, common.columnLeft]}>
              <View style={styles.columnFill}>
                <DayMeetingsPanel
                  date={calendarTab === 'tomorrow' ? tomorrowDate : todayDate}
                  entries={calendarTab === 'tomorrow' ? meetingsTomorrow : meetingsToday}
                  tabs={CALENDAR_TABS}
                  activeTab={calendarTab}
                  onTabChange={setCalendarTab}
                  renderRow={renderMeetingEntry}
                  listResetKey={tagFilter ?? '__off__'}
                  emptyHint={`Nothing ${calendarTab === 'tomorrow' ? 'tomorrow' : 'today'}.`}
                  googlePanel={
                    features.googleCalendar ? (
                      <GoogleCalendarPanel
                        maxDays={2}
                        defaultDestination={FIXED_INBOX_DESTINATION}
                        items={items}
                        icsUrl={settings?.googleCalendarIcsUrl ?? ''}
                        inboxPath={inboxPath ?? ''}
                        onOpenSettings={() => onOpenCalendarSettings?.()}
                        textColor={textColor}
                        borderColor={borderColor}
                        placeholderColor={placeholderColor}
                      />
                    ) : null
                  }
                  textColor={textColor}
                  borderColor={borderColor}
                />
              </View>
            </View>
            <View style={common.column}>
              <DailyTodosColumn
                quickAdd={quickAdd}
                panel={
                  context.model && context.entry ? (
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
                      onOpenItem={path => {
                        const owner = items.find(i => i.path === path);
                        if (owner) onOpenItem(owner.kind, {name: owner.name, path, isFolder: true});
                      }}
                      textColor={textColor}
                      borderColor={borderColor}
                    />
                  ) : undefined
                }
                rows={taskRows}
                renderEntry={(row: Extract<FlatTaskRow, {kind: 'entry'}>, heightPx) => renderTaskEntry(row.entry, heightPx)}
                onOpenItem={openItem}
                tagFilter={tagFilter}
                failedItemNames={displayAggregate.failedItems.map(f => f.item.name)}
                footer={context.model ? undefined : <HiddenLine text={hiddenText} onShow={contextFilter.show} textColor={textColor} />}
                textColor={textColor}
                borderColor={borderColor}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  middleRow: {flexDirection: 'row', flex: 1, marginTop: 4},
  columnFill: {flex: 1},
});
