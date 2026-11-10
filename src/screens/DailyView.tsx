/**
 * Daily (design-overview.md §2.7, docs/dev/history/technical-design-daily-slim.md §3.1):
 * two columns.
 *
 * - Left: the day panel (ui/DayMeetingsPanel.tsx: Today | Tomorrow | Google),
 *   the whole column.
 * - Right: the Quick Add zone (screens/daily/SelectionZone.tsx): one Quick
 *   Add, always to the Inbox (docs/dev/history/technical-design-filing-unification.md
 *   §6), above the Next todos grouped by owner (screens/daily/DailyTodosColumn.tsx).
 *   A selected row's card takes Quick Add's place (ui/useEditTarget.ts: first
 *   tap card, second tap edit). A selected meeting or focus block shows its
 *   context panel (ui/meetingContext/) in the Next todos' place; "+ Quick Add
 *   to meeting" turns the card's slot into Quick Add for it (`add` mode) until
 *   the add or "‹ Back to the card".
 *
 * This component does not read the selection
 * (docs/dev/history/technical-design-calmer-screens.md §3.1.3): the zone and
 * each row read the screen's selection store, so a tap re-renders neither
 * this screen nor its lists.
 *
 * What shows is storage/dailyAggregate.ts's rule over the cache and the
 * Inbox (screens/daily/useDailyData.ts). Every write goes through
 * ui/useEntryActions.ts, the path the overviews use too; rows can belong to
 * different Projects/Areas or the Inbox, so each action re-reads its entry's
 * own source. Daily's tag filter (technical-design-context-tags.md §6) was removed in
 * 0.24.0 (docs/dev/history/technical-design-launch-ready.md L6b): a meeting's todos show in its
 * context panel instead.
 */
import React, {useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {Destination} from '../domain/destination';
import {
  buildDailyAggregate,
  dailyEntryDate,
  DailyAggregate,
  DailyItemRef,
  DailyMeetingEntry,
  DailyTaskEntry,
  groupDailyTasksByItem,
  inboxItemRef,
} from '../storage/dailyAggregate';
import {inboxSummary, isOpenInboxTodo} from '../domain/inboxCount';
import {useOpenMarks} from '../ui/useOpenMarks';
import InboxList, {ALL_MARKS, inboxRows} from './daily/InboxList';
import {FolderEntry} from '../supernote/fileSystem';
import {usePerfRender} from '../utils/perf';
import GoogleCalendarPanel from '../ui/GoogleCalendarPanel';
import {useFeatures} from '../ui/featureStore';
import MeetingRow, {MeetingRowLayout} from '../ui/MeetingRow';
import DayMeetingsPanel from '../ui/DayMeetingsPanel';
import {MiniTabDef} from '../ui/MiniTabs';
import TaskRow, {taskRowLines} from '../ui/TaskRow';
import {common} from '../ui/commonStyles';
import LoadErrorNotice from '../ui/LoadErrorNotice';
import {useThemeColors} from '../ui/theme';
import {useStableCallback} from '../ui/useStableCallback';
import {useEntryActions} from '../ui/useEntryActions';
import {tallyHidden} from '../domain/contexts';
import HiddenLine from '../ui/context/HiddenLine';
import {useContextMatcher} from '../ui/context/useContextMatcher';
import {DailyTab, splitDaily} from '../domain/listTabs';
import {CountTabDef, shownCountTabs} from '../ui/CountTabs';
import {useListTab} from '../ui/listTabStore';
import {useJustDone} from '../ui/useJustDone';
import DailyTodosColumn from './daily/DailyTodosColumn';
import SelectionZone from './daily/SelectionZone';
import {flattenTaskGroups, FlatTaskRow, meetingKey, taskKey} from './daily/dailyRows';
import {useDailyData} from './daily/useDailyData';
import {estimatorWidth} from '../ui/ScreenSize';

interface Props {
  onOpenItem: (kind: 'project' | 'area', entry: FolderEntry) => void;
  /** Switches to Settings → Features, where the calendar link goes (the Google tab's empty state). */
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

export default function DailyView({onOpenItem, onOpenCalendarSettings}: Props): React.JSX.Element {
  usePerfRender('DailyView');
  const {textColor, borderColor, placeholderColor} = useThemeColors();
  const data = useDailyData('DailyView');
  const {items, inbox, inboxPath, paths, settings, todayDate, tomorrowDate} = data;
  const actions = useEntryActions('DailyView', {hiddenNotice: true, readSelection: false});
  const {select: selectEditTarget, store: selection} = actions.edit;
  const features = useFeatures();
  const [calendarTab, setCalendarTab] = useState<CalendarTab>('today');
  // The count tabs (docs/dev/history/technical-design-calmer-screens.md §3.5): the chosen one, and the
  // todos ticked here, which stay struck through in their tab until the tab changes or Daily is left.
  const [tab, setTab] = useListTab<DailyTab>('daily', 'next');
  const justDone = useJustDone<string>(tab);
  const tickTodo = useStableCallback((entry: DailyTaskEntry) => {
    if (!entry.task.done) justDone.add(taskKey(entry));
    actions.toggleDone(entry);
  });

  const openItem = useStableCallback((item: DailyItemRef) => {
    // The Inbox lives on Daily's Inbox tab (§3.7).
    if (item.kind === 'inbox') {
      setTab('inbox');
      return;
    }
    onOpenItem(item.kind, {name: item.name, path: item.path, isFolder: true});
  });
  const openOwner = useStableCallback((path: string) => {
    const owner = items.find(i => i.path === path);
    if (owner) onOpenItem(owner.kind, {name: owner.name, path, isFolder: true});
  });

  const inboxInput = inbox ? {tasks: inbox.tasks, meetings: inbox.meetings} : null;
  // The active context hides todos and dims meetings (docs/dev/history/technical-design-time-and-place.md §3.3).
  const contextFilter = useContextMatcher();
  const {matcher} = contextFilter;
  // Recomputed after midnight through todayDate (render-perf-ab §3 B4).
  const aggregate: DailyAggregate | null = useMemo(
    () => (inboxPath !== null ? buildDailyAggregate(items, inboxInput, inboxPath, new Date(), matcher, justDone.keys) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayDate: recompute after midnight
    [items, inbox, inboxPath, todayDate, matcher, justDone.keys],
  );
  const displayAggregate: DailyAggregate = aggregate ?? EMPTY_DAILY_AGGREGATE;
  const hiddenText = contextFilter.lineText(tallyHidden(displayAggregate.hiddenTasks ?? [], contextFilter.kinds, todayDate));

  // dailyEntryDate: a multi-day meeting is listed on each day it covers.
  const meetingsToday = displayAggregate.meetings.filter(entry => dailyEntryDate(entry) === todayDate);
  const meetingsTomorrow = displayAggregate.meetings.filter(entry => dailyEntryDate(entry) === tomorrowDate);
  const split = useMemo(
    () => splitDaily(displayAggregate.tasks, displayAggregate.doneToday ?? [], todayDate),
    [displayAggregate.tasks, displayAggregate.doneToday, todayDate],
  );
  // The Inbox tab (§3.7): marks, open todos and meetings, never hidden by the context. A todo ticked
  // there stays, struck through, like on the other tabs.
  const openMarks = useOpenMarks(ALL_MARKS).length;
  const inboxLists = useMemo(() => {
    if (!inbox || inboxPath === null) return {summary: null, todos: [] as DailyTaskEntry[], meetings: [] as DailyMeetingEntry[]};
    const summary = inboxSummary(inbox.tasks, inbox.meetings, openMarks, todayDate);
    const item = inboxItemRef(inboxPath);
    const todos = inbox.tasks
      .map((task, taskIndex): DailyTaskEntry => ({item, taskIndex, task}))
      .filter(e => isOpenInboxTodo(e.task) || justDone.keys.has(taskKey(e)));
    const meetings = summary.meetings.map((meetingIndex): DailyMeetingEntry => ({item, meetingIndex, meeting: inbox.meetings[meetingIndex]}));
    return {summary, todos, meetings};
  }, [inbox, inboxPath, openMarks, todayDate, justDone.keys]);
  const inboxOrder = useMemo(
    () => [
      ...inboxLists.todos.map(e => ({type: 'task' as const, index: e.taskIndex})),
      ...inboxLists.meetings.map(e => ({type: 'meeting' as const, index: e.meetingIndex})),
    ],
    [inboxLists],
  );
  const inboxRowsList = useMemo(() => inboxRows(openMarks, inboxLists.todos, inboxLists.meetings), [openMarks, inboxLists]);
  const countTabs: CountTabDef<DailyTab>[] = useMemo(
    () => [
      {key: 'next', label: 'Next', count: split.counts.next, fixed: true},
      {key: 'waiting', label: 'Waiting', count: split.counts.waiting, bell: split.bells.waiting, fixed: true},
      {key: 'inbox', label: 'Inbox', count: inboxLists.summary?.count ?? 0, bell: inboxLists.summary?.bell ?? 0, fixed: true},
      {key: 'done', label: 'Done', count: split.counts.done, fixed: false},
    ],
    [split, inboxLists],
  );
  // The tab shown: Done, once empty (its last item unticked), falls back to the first tab - the list follows it.
  const shownTab = shownCountTabs(countTabs, tab).activeKey;
  const taskRows = useMemo(() => (shownTab === 'inbox' ? [] : flattenTaskGroups(groupDailyTasksByItem(split.lists[shownTab]))), [split, shownTab]);
  const failedNamesKey = displayAggregate.failedItems.map(f => f.item.name).join('\n');
  const failedItemNames = useMemo(() => (failedNamesKey ? failedNamesKey.split('\n') : []), [failedNamesKey]);

  const renderTaskEntry = useStableCallback((row: Extract<FlatTaskRow, {kind: 'entry'}>, heightPx: number) => {
    const entry: DailyTaskEntry = row.entry;
    const key = taskKey(entry);
    return (
      <TaskRow
        key={key}
        task={entry.task}
        selection={{store: selection, key: `task:${key}`}}
        onStartEdit={() => selectEditTarget({type: 'task', key})}
        onToggleDone={() => tickTodo(entry)}
        onCreateNote={() => actions.taskNote(entry)}
        onOpenNote={() => actions.taskNote(entry)}
        linkedFile={entry.task.linkedFile}
        onOpenLinkedFile={actions.openFile}
        ownerPath={entry.item.path}
        context="quiet"
        height={heightPx}
        numberOfLines={taskRowLines(entry.task, estimatorWidth(), 'quiet')}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  });

  // The Inbox tab's rows: a todo's grey note says when it was captured; a meeting shows its date.
  const renderInboxTodo = useStableCallback((entry: DailyTaskEntry, heightPx: number) => {
    const key = taskKey(entry);
    return (
      <TaskRow
        key={key}
        task={entry.task}
        selection={{store: selection, key: `task:${key}`}}
        onStartEdit={() => selectEditTarget({type: 'task', key})}
        onToggleDone={() => tickTodo(entry)}
        onCreateNote={() => actions.taskNote(entry)}
        onOpenNote={() => actions.taskNote(entry)}
        linkedFile={entry.task.linkedFile}
        onOpenLinkedFile={actions.openFile}
        ownerPath={entry.item.path}
        context="inbox"
        height={heightPx}
        numberOfLines={taskRowLines(entry.task, estimatorWidth(), 'inbox')}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  });
  const renderInboxMeeting = useStableCallback((entry: DailyMeetingEntry) => {
    const key = meetingKey(entry);
    return (
      <MeetingRow
        key={key}
        meeting={entry.meeting}
        layout="oneLine"
        time="dateTime"
        tracking={actions.tracking()}
        note={{onOpen: () => actions.meetingNote(entry), onCreate: () => actions.meetingNote(entry)}}
        noteOnlyWhenExists
        file={{linkedFile: entry.meeting.linkedFile, onOpen: actions.openFile}}
        onPress={() => selectEditTarget({type: 'meeting', key})}
        selection={{store: selection, key: `meeting:${key}`}}
        ownerPath={entry.item.path}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  });

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
        noteOnlyWhenExists
        file={{linkedFile: entry.meeting.linkedFile, onOpen: actions.openFile}}
        onPress={() => selectEditTarget({type: 'meeting', key})}
        dimmed={entry.contextState === 'dimmed'}
        selection={{store: selection, key: `meeting:${key}`}}
        ownerPath={entry.item.path}
        textColor={textColor}
        borderColor={borderColor}
      />
    );
  };

  // Called only from Quick Add's handlers, never while it renders.
  const stableIsMeetingDateVisible = useStableCallback((date: string) =>
    calendarTab === 'today' ? date === todayDate : calendarTab === 'tomorrow' ? date === tomorrowDate : false,
  );

  const footer = useMemo(
    () => <HiddenLine text={hiddenText} onShow={contextFilter.show} textColor={textColor} />,
    [hiddenText, contextFilter.show, textColor],
  );
  const inboxList = useMemo(
    () => (
      <InboxList
        rows={inboxRowsList}
        renderTodo={renderInboxTodo}
        renderMeeting={renderInboxMeeting}
        marksReturnTo="daily"
        heightKey="daily:todos:inbox"
        textColor={textColor}
        borderColor={borderColor}
      />
    ),
    [inboxRowsList, renderInboxTodo, renderInboxMeeting, textColor, borderColor],
  );
  const list = (
    <DailyTodosColumn
      inboxList={inboxList}
      tabs={countTabs}
      tab={shownTab}
      onTabChange={setTab}
      rows={taskRows}
      renderEntry={renderTaskEntry}
      onOpenItem={openItem}
      failedItemNames={failedItemNames}
      footer={footer}
      textColor={textColor}
      borderColor={borderColor}
    />
  );

  return (
    <View style={common.container}>
      {data.loading && <ActivityIndicator style={common.spacer} />}
      {!data.loading && data.error && <LoadErrorNotice error={data.error} onRetry={data.retry} textColor={textColor} />}
      {!data.loading && !data.error && aggregate && (
        <View style={common.content}>
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
                  emptyHint={`Nothing ${calendarTab === 'tomorrow' ? 'tomorrow' : 'today'}.`}
                  compact
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
              <SelectionZone
                actions={actions}
                aggregate={aggregate}
                items={items}
                inbox={inbox}
                inboxPath={inboxPath}
                paths={paths}
                settings={settings}
                initialDate={calendarTab === 'tomorrow' ? tomorrowDate : todayDate}
                isMeetingDateVisible={stableIsMeetingDateVisible}
                openItem={openItem}
                onOpenOwner={openOwner}
                onTickTodo={tickTodo}
                extraTasks={inboxLists.todos}
                extraMeetings={inboxLists.meetings}
                inboxTab={shownTab === 'inbox'}
                inboxOrder={inboxOrder}
                list={list}
                textColor={textColor}
                borderColor={borderColor}
                placeholderColor={placeholderColor}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  middleRow: {flexDirection: 'row', flex: 1},
  columnFill: {flex: 1},
});
