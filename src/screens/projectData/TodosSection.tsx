/**
 * The Todos list of the Current page's right pane (screens/ProjectDataPanel.tsx):
 * count tabs Next · Waiting · Plan · Someday · Done
 * (docs/dev/history/technical-design-calmer-screens.md §3.5) over one
 * PagedSection with the chosen tab's todos - the todos of each active loop
 * first, under the loop's name and main date
 * (docs/dev/history/technical-design-loops.md §4.7) - with its own row
 * actions (done toggle, note), and below it the `footer` (the agreements
 * line). Add, edit and delete live in ProjectDataPanel's single Quick Add
 * above both lists.
 */
import React, {useState} from 'react';
import {usePerfRender} from '../../utils/perf';
import {Keyboard, LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import {Task} from '../../domain/types';
import {formatDate} from '../../domain/dateFormat';
import {groupTodosByLoop} from '../../domain/loops';
import {LoopLine} from '../../domain/loopsSection';
import {withTaskDone} from '../../domain/taskEdit';
import {todayIso} from '../../domain/meetingTime';
import {openOrCreateTodoNote} from '../../storage/meetingNoteContent';
import {loadSettings} from '../../storage/settingsStorage';
import {CurrentTab, splitCurrent} from '../../domain/listTabs';
import CountTabs, {CountTabDef, shownCountTabs} from '../../ui/CountTabs';
import {useListTab} from '../../ui/listTabStore';
import {useJustDone} from '../../ui/useJustDone';
import {useEngagePrompt} from '../../ui/useEngagePrompt';
import {useNoteCreateConfirm} from '../../ui/useNoteCreateConfirm';
import PagedSection from '../../ui/PagedSection';
import TaskRow, {taskRowHeight, taskRowLines} from '../../ui/TaskRow';
import {useErrorStatus} from '../../ui/status/StatusProvider';
import {log, logError} from '../../utils/log';
import {errorMessage} from '../../utils/errorMessage';
import {PaneColors, sectionStyles as styles, SUBHEADING_ROW_PX} from './panelLayout';
import {estimatorWidth} from '../../ui/ScreenSize';
import {SelectionReader} from '../../ui/selectionStore';

/** One flattened Todos row - a flow-state group's header, or a task -
 * see the "Flattened into one paginated sequence" comment inside
 * TodosSection below. */
type TodoFlatRow =
  | {kind: 'header'; rowKey: string; label: string}
  | {kind: 'entry'; rowKey: string; task: Task; index: number};

function TodosSection({
  itemPath,
  tasks,
  onSave,
  selection,
  armingIndex,
  onStartEdit,
  onArmLink,
  onOpenLinkedFile,
  filter,
  loops = [],
  footer,
  textColor,
  borderColor,
}: Pick<PaneColors, 'textColor' | 'borderColor'> & {
  /** Below the list: the "◇ Agreements n ›" line (screens/projectData/AgreementsList.tsx). */
  footer?: React.ReactNode;
  itemPath: string;
  tasks: Task[];
  /** The item's `## Loops` lines: the todos of each active loop are listed first, under the loop. */
  loops?: readonly LoopLine[];
  onSave: (next: Task[]) => Promise<void>;
  /** The page's selection store (ui/selectionStore.ts): each row reads whether it is the selected one (key `task:<index>`), so a tap re-renders that row, not this list. Add/edit/delete lives in the single QuickAddWidget above both sections (docs/dev/history/technical-design-unified-quickadd.md §8). */
  selection: SelectionReader;
  armingIndex: number | null;
  onStartEdit: (index: number) => void;
  onArmLink: (index: number) => void;
  onOpenLinkedFile: (linkedFile: string) => void;
  /** The counterpart filter (counterpartFilter.tsx): only todos it accepts show. Applied after grouping, like hideDone. */
  filter?: ((task: Task) => boolean) | null;
}): React.JSX.Element {
  usePerfRender('TodosSection');
  const [actionError, setActionError] = useState<string | null>(null);
  useErrorStatus('ProjectDataPanel.actionError', actionError, () => setActionError(null));
  const confirmNoteCreate = useNoteCreateConfirm('ProjectDataPanel.todoNoteCreateConfirm');

  // Count tabs (docs/dev/history/technical-design-calmer-screens.md §3.5): Next · Waiting · Plan ·
  // Someday (with Maybe) · Done (the last 14 days). A todo ticked here stays struck through in its
  // tab until the tab changes, the page is left or another item opens.
  const [tab, setTab, tabChosen] = useListTab<CurrentTab>('current', 'next');
  const justDone = useJustDone<number>(`${tab}|${itemPath}`);
  const today = todayIso();
  const split = splitCurrent(tasks, today, justDone.keys);
  const passes = (index: number) => !filter || filter(tasks[index]);
  const shownIn = (key: CurrentTab) => split.lists[key].filter(passes);
  const countOf = (key: CurrentTab) => shownIn(key).filter(i => key === 'done' || !tasks[i].done).length;
  const countTabs: CountTabDef<CurrentTab>[] = [
    {key: 'next', label: 'Next', count: countOf('next'), fixed: true},
    {key: 'waiting', label: 'Waiting', count: countOf('waiting'), fixed: false},
    {key: 'plan', label: 'Plan', count: countOf('plan'), fixed: false},
    {key: 'someday', label: 'Someday', count: countOf('someday'), fixed: false},
    {key: 'done', label: 'Done', count: countOf('done'), fixed: false},
  ];
  // Until a tab is chosen, an empty Next gives way to the first tab with todos, so a page with only
  // planned todos doesn't open on an empty list.
  const firstFull = countTabs.find(t => t.count > 0)?.key ?? 'next';
  const activeTab = shownCountTabs(countTabs, !tabChosen && countTabs[0].count === 0 ? firstFull : tab).activeKey;

  // The chosen tab's todos, the todos of each active loop first under the loop's name and main
  // date (docs/dev/history/technical-design-loops.md §4.7). Each entry keeps its index into the full
  // `tasks` array, which every row action writes back to.
  const inTab = shownIn(activeTab);
  const loopGroups = groupTodosByLoop(
    inTab.map(index => ({task: tasks[index], index, tags: tasks[index].tags})),
    loops,
  ).filter(group => group.loop !== null);
  const inLoop = new Set(loopGroups.flatMap(group => group.todos.map(t => t.index)));
  const rest = inTab.filter(index => !inLoop.has(index));
  const flatRows: TodoFlatRow[] = [
    ...loopGroups.flatMap(group => [
      {
        kind: 'header',
        rowKey: `header-loop-${group.loop!.tag}`,
        label: `○ ${group.loop!.tag.split('/').slice(1).join('/')}${group.loop!.mainDate ? ` · ${formatDate(group.loop!.mainDate, today)}` : ''}`,
      } as TodoFlatRow,
      ...group.todos.map(({index}): TodoFlatRow => ({kind: 'entry', rowKey: `task-${index}`, task: tasks[index], index})),
    ]),
    ...(loopGroups.length > 0 && rest.length > 0 ? [{kind: 'header', rowKey: 'header-rest', label: 'Other'} as TodoFlatRow] : []),
    ...rest.map((index): TodoFlatRow => ({kind: 'entry', rowKey: `task-${index}`, task: tasks[index], index})),
  ];
  const engagePrompt = useEngagePrompt('TodosSection');
  const runAction = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
      log('TodosSection: action done');
    } catch (e) {
      logError('TodosSection: action failed', errorMessage(e));
      setActionError(errorMessage(e));
    }
  };

  const handleToggleDone = (index: number) => {
    Keyboard.dismiss();
    if (!tasks[index].done) justDone.add(index);
    runAction(async () => {
      const next = tasks.slice();
      next[index] = withTaskDone(next[index], !next[index].done, todayIso());
      await onSave(next);
      if (!tasks[index].done) engagePrompt.afterDone(itemPath, tasks[index]);
    });
  };

  /**
   * Shared Note Pages (docs/dev/history/technical-design-shared-note-pages.md §6): one
   * call into `openOrCreateTodoNote` - it decides create-vs-open (and
   * own-vs-shared-target) internally and ends by opening the resolved page
   * itself, so this handler only has to persist the (possibly unchanged) `tasks` array through this section's
   * own `onSave` prop when `notePath` changed.
   */
  const handleNote = (index: number) => {
    Keyboard.dismiss();
    runAction(async () => {
      const settings = await loadSettings();
      const {task, changed} = await openOrCreateTodoNote(tasks[index], itemPath, settings, null, {confirmCreate: confirmNoteCreate});
      if (changed) {
        const next = tasks.slice();
        next[index] = task;
        await onSave(next);
      }
    });
  };

  return (
    <View style={styles.section}>
      {/* "Todos" heading and pagination in one PagedSection
          (docs/dev/history/technical-design-pagination-fixed-height.md §3.4). An
          empty list shows `emptyHint` and still reserves the box's full
          height - these boxes are fixed and always there. */}
      <CountTabs tabs={countTabs} activeKey={activeTab} onChange={setTab} textColor={textColor} borderColor={borderColor} />
      <PagedSection
        header=""
        heightKey={[`current:Todos:${activeTab}:${itemPath}`, 'current:Todos']}
        resetKey={`${activeTab}|${itemPath}`}
        rows={flatRows}
        rowHeight={row => (row.kind === 'header' ? SUBHEADING_ROW_PX : taskRowHeight(row.task, estimatorWidth(), 'quiet'))}
        isCountableRow={row => row.kind === 'entry'}
        renderRow={row =>
          row.kind === 'header' ? (
            // Exactly the height the pages are counted with, so the last row of a page is never cut
            // off at the Agreements line (docs/dev/history/technical-design-quickadd-redesign.md §3.8 F9).
            <View key={row.rowKey} style={headerRow.box} onLayout={logHeaderHeight}>
              <Text style={[styles.subheading, headerRow.text, {color: textColor}]} numberOfLines={1}>
                {row.label}
              </Text>
            </View>
          ) : (
            <TaskRow
              key={row.rowKey}
              task={row.task}
              selection={{store: selection, key: `task:${row.index}`}}
              isArming={armingIndex === row.index}
              onStartEdit={() => onStartEdit(row.index)}
              onToggleDone={() => handleToggleDone(row.index)}
              onCreateNote={() => handleNote(row.index)}
              onOpenNote={() => handleNote(row.index)}
              linkedFile={row.task.linkedFile}
              onOpenLinkedFile={onOpenLinkedFile}
              onArmLink={() => onArmLink(row.index)}
              ownerPath={itemPath}
              context="quiet"
              height={taskRowHeight(row.task, estimatorWidth(), 'quiet')}
              numberOfLines={taskRowLines(row.task, estimatorWidth(), 'quiet')}
              textColor={textColor}
              borderColor={borderColor}
            />
          )
        }
        emptyHint={filter ? 'No todos for this counterpart here.' : tasks.length === 0 ? 'No todos yet.' : 'Nothing here.'}
        textColor={textColor}
        borderColor={borderColor}
      />
      {footer}
    </View>
  );
}

/** Memoized: the page passes stable props, so selecting a row leaves the list as it is. */
export default React.memo(TodosSection);

let headerHeightLogged = false;
/** F9 diagnostic: a group heading drawn at another height than the pages count with, logged once. */
function logHeaderHeight(e: LayoutChangeEvent): void {
  const real = Math.round(e.nativeEvent.layout.height);
  if (headerHeightLogged || real === SUBHEADING_ROW_PX) return;
  headerHeightLogged = true;
  log(`TodosSection: current todos header real=${real} est=${SUBHEADING_ROW_PX}`);
}

const headerRow = StyleSheet.create({
  box: {height: SUBHEADING_ROW_PX, justifyContent: 'flex-end', overflow: 'hidden'},
  text: {marginTop: 0},
});
