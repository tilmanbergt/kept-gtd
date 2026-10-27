/**
 * Focus mode (docs/dev/history/technical-design-now-focus-mode.md, design-philosophy.md
 * §8): Daily's one-column, no-TabBar screen around the `#now` todos, shown by
 * App.tsx for `mode === 'focus'`. App.tsx mounts it fresh on every entry, so
 * its session state is plain `useState`:
 *
 * - `pickerMode`: has "Start focus session" been pressed yet. Set once, after
 *   the first load, to "picker" only when no todo is `#now` yet (reopening
 *   returns to a running session). A picker double tap writes `#now` at once,
 *   so this flag, not the tags, decides when the working view starts.
 * - `focusEntryNowMs`: "now" for the 4-hour meeting look-ahead, taken at entry
 *   and never refreshed (§4/§6).
 * - `justCompletedTasks`: the cohort that was just finished, so the
 *   Congratulations view has something to show after the clear.
 *
 * The only durable state is `settings.focusModeActive` (App.tsx). Writes go
 * through ui/useEntryActions.ts like Daily's.
 */
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Destination} from '../../domain/destination';
import {meetingTimestampMs, todayIso} from '../../domain/meetingTime';
import {setNowTag} from '../../domain/flowState';
import {withTaskDone, withTaskText} from '../../domain/taskEdit';
import {
  buildDailyAggregate,
  buildFocusCandidateEntries,
  buildNowEntries,
  DailyMeetingEntry,
  DailyTaskEntry,
  groupDailyTasksByItem,
} from '../../storage/dailyAggregate';
import {getCachedData} from '../../storage/dataCache';
import {FolderEntry} from '../../supernote/fileSystem';
import {common} from '../../ui/commonStyles';
import {ExitFocusModeIcon} from '../../ui/icons';
import LoadErrorNotice from '../../ui/LoadErrorNotice';
import MeetingRow from '../../ui/MeetingRow';
import QuickAddWidget from '../../ui/QuickAddWidget';
import TaskRow from '../../ui/TaskRow';
import {FONT, useThemeColors} from '../../ui/theme';
import {useEntryActions} from '../../ui/useEntryActions';
import {useStableCallback} from '../../ui/useStableCallback';
import {log} from '../../utils/log';
import {usePerfRender} from '../../utils/perf';
import {meetingKey, taskKey} from './dailyRows';
import {useDailyData} from './useDailyData';

const FIXED_INBOX_DESTINATION: Destination = {type: 'inbox'};
const LOOK_AHEAD_MS = 4 * 60 * 60 * 1000;

interface Props {
  /** The exit mark: ends the session (App.tsx's onExitFocusMode); never clears `#now`. */
  onExitFocusMode: () => void;
  onOpenItem: (kind: 'project' | 'area', entry: FolderEntry) => void;
  onOpenInbox?: () => void;
}

export default function FocusModeScreen({onExitFocusMode, onOpenItem, onOpenInbox}: Props): React.JSX.Element {
  usePerfRender('FocusModeScreen');
  const {textColor, borderColor, placeholderColor} = useThemeColors();
  const data = useDailyData('FocusMode');
  const {items, inbox, inboxPath, todayDate} = data;
  const actions = useEntryActions('FocusMode');
  const inboxInput = inbox ? {tasks: inbox.tasks, meetings: inbox.meetings} : null;

  const pickerModeInitRef = useRef(false);
  const [pickerMode, setPickerMode] = useState(true);
  const [focusEntryNowMs] = useState(() => Date.now());
  const [justCompletedTasks, setJustCompletedTasks] = useState<DailyTaskEntry[] | null>(null);

  useEffect(() => {
    if (pickerModeInitRef.current || data.loading) return;
    pickerModeInitRef.current = true;
    setPickerMode(buildNowEntries(items, inboxInput, inboxPath ?? '').length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.loading, items, inbox, inboxPath]);

  /**
   * The working view's checkbox: ticks like Daily, then - only when the last
   * open `#now` todo became done - snapshots the cohort and clears `#now` on
   * all of it, one write after another. Each Inbox write's result is handed to
   * the next (ui/useEntryActions.ts's saveTasks), so several Inbox todos in
   * one cohort don't overwrite each other.
   */
  const toggleDoneInSession = async (entry: DailyTaskEntry) => {
    const wasDone = entry.task.done;
    const doneResult = await actions.saveTasks(entry, tasks => {
      tasks[entry.taskIndex] = withTaskDone(tasks[entry.taskIndex], !wasDone, todayIso());
      return tasks;
    });
    if (wasDone) return;
    const inboxForCohort = entry.item.kind === 'inbox' ? doneResult ?? undefined : inbox ?? undefined;
    const cohort = buildNowEntries(
      getCachedData()?.items ?? items,
      inboxForCohort ? {tasks: inboxForCohort.tasks, meetings: inboxForCohort.meetings} : null,
      inboxPath ?? '',
    );
    if (cohort.some(e => !e.task.done)) return;
    setJustCompletedTasks(cohort);
    let inboxState = inboxForCohort;
    for (const doneEntry of cohort) {
      const nextInbox = await actions.saveTasks(
        doneEntry,
        tasks => {
          const task = tasks[doneEntry.taskIndex];
          tasks[doneEntry.taskIndex] = withTaskText(task, setNowTag(task.text, false));
          return tasks;
        },
        inboxState,
      );
      if (nextInbox) inboxState = nextInbox;
    }
    log('FocusMode: cohort cleared', cohort.length);
  };

  const stableAddTask = useStableCallback(actions.addTask);
  const stableAddMeeting = useStableCallback(actions.addMeeting);

  if (data.loading) return <ActivityIndicator style={common.spacer} />;
  if (data.error) return <LoadErrorNotice error={data.error} onRetry={data.retry} textColor={textColor} />;

  const nowCohort = buildNowEntries(items, inboxInput, inboxPath ?? '');
  const pickerCandidates = buildFocusCandidateEntries(items);
  // The 4-hour look-ahead is judged against the moment focus mode was entered.
  const focusMeetings = buildDailyAggregate(items, inboxInput, inboxPath ?? '').meetings.filter(entry => {
    const ts = meetingTimestampMs(entry.meeting, new Date(focusEntryNowMs));
    return ts >= focusEntryNowMs && ts - focusEntryNowMs <= LOOK_AHEAD_MS;
  });
  const focusState: 'picker' | 'working' | 'complete' =
    justCompletedTasks && justCompletedTasks.length > 0 ? 'complete' : pickerMode || nowCohort.length === 0 ? 'picker' : 'working';

  // Focus mode's rows are not editable; the double tap is offered in the picker only.
  const renderTask = (entry: DailyTaskEntry, onToggleDone: () => void, allowToggleNow: boolean) => (
    <TaskRow
      key={taskKey(entry)}
      task={entry.task}
      isEditing={false}
      onStartEdit={() => {}}
      onToggleDone={onToggleDone}
      onCreateNote={() => actions.taskNote(entry)}
      onOpenNote={() => actions.taskNote(entry)}
      linkedFile={entry.task.linkedFile}
      onOpenLinkedFile={actions.openFile}
      onToggleNow={allowToggleNow ? () => actions.toggleNow(entry) : undefined}
      context="flat"
      textColor={textColor}
      borderColor={borderColor}
    />
  );
  const renderGroups = (entries: DailyTaskEntry[], row: (entry: DailyTaskEntry) => React.ReactNode) =>
    groupDailyTasksByItem(entries).map(group => (
      <View key={group.item.path}>
        <Text style={[common.subheading, styles.groupHeading, {color: textColor}]} numberOfLines={1}>
          {group.item.name}
        </Text>
        {group.entries.map(row)}
      </View>
    ));
  const renderMeeting = (entry: DailyMeetingEntry) => (
    <MeetingRow
      key={`${meetingKey(entry)}@${entry.span?.date ?? ''}`}
      meeting={entry.meeting}
      span={entry.span}
      layout="oneLine"
      time="time"
      source={{
        abbrev: entry.item.abbrev ?? entry.item.name,
        name: entry.item.name,
        onPress: () => (entry.item.kind === 'inbox' ? onOpenInbox?.() : onOpenItem(entry.item.kind, {name: entry.item.name, path: entry.item.path, isFolder: true})),
      }}
      highlight="mark"
      tracking={actions.tracking()}
      note={{onOpen: () => actions.meetingNote(entry), onCreate: () => actions.meetingNote(entry)}}
      file={{linkedFile: entry.meeting.linkedFile, onOpen: actions.openFile}}
      ownerPath={entry.item.path}
      textColor={textColor}
      borderColor={borderColor}
    />
  );

  return (
    <View style={common.container}>
      <View style={styles.focusContent}>
        <ScrollView style={styles.focusColumn} contentContainerStyle={styles.focusColumnContent}>
          <QuickAddWidget
            fixedDestination={FIXED_INBOX_DESTINATION}
            onAddTask={stableAddTask}
            onAddMeeting={stableAddMeeting}
            initialDate={todayDate}
            textColor={textColor}
            borderColor={borderColor}
            placeholderColor={placeholderColor}
          />
          <View style={[common.divider, {backgroundColor: borderColor}]} />

          {focusState === 'complete' && (
            <>
              <Text style={[styles.sectionTitle, {color: textColor}]}>Congratulations: All tasks done!</Text>
              {renderGroups(justCompletedTasks ?? [], entry => renderTask(entry, () => actions.toggleDone(entry), false))}
              <Pressable onPress={() => setJustCompletedTasks(null)} hitSlop={8} style={[styles.primaryButton, {borderColor}]}>
                <Text style={[styles.primaryButtonText, {color: textColor}]}>Create new session</Text>
              </Pressable>
            </>
          )}

          {focusState === 'working' && renderGroups(nowCohort, entry => renderTask(entry, () => actions.rowRun(() => toggleDoneInSession(entry)), false))}

          {focusState === 'picker' && (
            <>
              <View style={styles.pickerHeader}>
                <Text style={[common.hint, styles.pickerHint, {color: textColor}]}>Double-tap a task to select it, then</Text>
                <Pressable onPress={() => setPickerMode(false)} hitSlop={8} style={[styles.primaryButton, {borderColor}]}>
                  <Text style={[styles.primaryButtonText, {color: textColor}]}>Start focus session</Text>
                </Pressable>
              </View>
              {pickerCandidates.length === 0 && (
                <Text style={[common.hint, {color: textColor}]}>No Next tasks in focused Projects/Areas to pick from.</Text>
              )}
              {renderGroups(pickerCandidates, entry => renderTask(entry, () => actions.toggleDone(entry), true))}
            </>
          )}

          <View style={styles.spacer} />

          {focusMeetings.length > 0 && (
            <View>
              <Text style={[common.subheading, {color: textColor}]}>Coming up</Text>
              {focusMeetings.map(renderMeeting)}
            </View>
          )}
        </ScrollView>

        {/* A small, solid exit mark in the bottom-right corner: quiet by size and place, readable on e-ink. */}
        <Pressable onPress={onExitFocusMode} hitSlop={12} style={styles.exit}>
          <ExitFocusModeIcon color={textColor} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  focusContent: {flex: 1, position: 'relative'},
  focusColumn: {flex: 1},
  focusColumnContent: {maxWidth: 480, width: '100%', alignSelf: 'center', paddingBottom: 24},
  sectionTitle: {fontSize: FONT.medium, fontWeight: '600', marginBottom: 8},
  spacer: {minHeight: 16},
  pickerHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  pickerHint: {flex: 1, marginBottom: 0, marginRight: 12},
  primaryButton: {borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start'},
  primaryButtonText: {fontSize: FONT.medium, fontWeight: '600'},
  exit: {position: 'absolute', right: 4, bottom: 4, padding: 8},
  groupHeading: {marginTop: 12},
});
