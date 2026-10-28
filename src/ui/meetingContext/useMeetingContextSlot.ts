/**
 * One screen's context panel wiring (docs/dev/history/technical-design-time-and-place.md §3.2):
 * the selected meeting as Engage's entry, the panel's model, and Quick Add's
 * props for its slot - in `add` mode the meeting's parts, destination and add
 * handlers, the Todo tab and "+ Add to <Name>" (§10 C4), otherwise the
 * screen's own. Daily, Week and Month (and so Review's Week ahead) use it;
 * the screen keeps its layout.
 *
 * The panel's todos are selectable (§10 C5): the slot keeps its own selection
 * (ui/useEntryActions.ts's edit state, `todoActions`); while a todo is
 * selected, `todoOverride` puts its card - and on a second tap its edit form -
 * in Quick Add's place. Its ✕, Cancel and Save return to the meeting's card.
 * Screens spread `todoOverride` onto Quick Add after their own props.
 */
import {useEffect, useMemo} from 'react';
import {Destination} from '../../domain/destination';
import {MeetingEntryRef} from '../../domain/engageOwner';
import {GtdParaSettings} from '../../domain/settings';
import {OwnerTodoRef} from '../../domain/engageOwner';
import {displayTaskText} from '../../domain/taskLabels';
import {Meeting} from '../../domain/types';
import {CachedItem} from '../../storage/dataCache';
import {ProjectFileState} from '../../storage/projectFile';
import {QuickAddAdds} from '../quickAdd/ProvenanceLine';
import {TodoCardData, useTodoCard} from '../itemCard/useTodoCard';
import {editTargetFor, MeetingQuickAddFields, QuickAddEditTarget} from '../QuickAddWidget';
import {EntryActions, useEntryActions} from '../useEntryActions';
import {EditMode} from '../useEditTarget';
import {useStableCallback} from '../useStableCallback';
import {useMeetingContext, MeetingContextData} from './useMeetingContext';
import {useMeetingQuickAdd} from './useMeetingQuickAdd';

type SelectedMeeting = {item: MeetingEntryRef['item']; meetingIndex: number; meeting: Meeting};

interface Base {
  addTask: (line: string, destination: Destination) => Promise<void>;
  addMeeting: (fields: MeetingQuickAddFields, destination: Destination) => Promise<void>;
}

export interface MeetingContextSlot extends MeetingContextData {
  entry: MeetingEntryRef | null;
  /** Quick Add shows for the selected meeting. */
  adding: boolean;
  /** Quick Add's props for the slot. */
  widget: {
    fixedDestination: Destination;
    provenance: QuickAddAdds | undefined;
    onAddTask: Base['addTask'];
    onAddMeeting: Base['addMeeting'];
    /** "+ Add to Atruvia" while adding to the meeting. */
    addToName: string | undefined;
    /** Changes when `add` mode starts: Quick Add shows its Todo tab. */
    showTodoKey: string | null;
  };
  /** The panel's todo rows: their actions and the selected one. */
  todoActions: EntryActions;
  selectedTodoKey: string | null;
  onSelectTodo: (todo: OwnerTodoRef) => void;
  /** Quick Add's props while a panel todo is selected, else null. */
  todoOverride: TodoOverride | null;
}

export interface TodoOverride {
  editTarget: QuickAddEditTarget | null;
  todoCard: TodoCardData | null;
  meetingCard: null;
  onSaveEditTask: (line: string, linkedFile: string) => Promise<boolean>;
  onSaveEditMeeting: undefined;
  onCancelEdit: () => void;
  /** The screen's meeting delete never reaches a todo. */
  onDeleteEdit: undefined;
  onQuickFile: undefined;
  editingItemPath: string | null;
  linkedFileMissing: false;
}

export const panelTodoKey = (todo: Pick<OwnerTodoRef, 'item' | 'taskIndex'>) => `${todo.item.path}#${todo.taskIndex}`;

function panelTodos(context: MeetingContextData): OwnerTodoRef[] {
  const model = context.model;
  if (!model) return [];
  const agreed = (model.agreed?.group.rows ?? []).flatMap(row => (row.kind === 'todo' ? [row.todo] : []));
  return [...model.owe, ...model.next, ...model.waiting, ...agreed];
}

export function useMeetingContextSlot(
  selected: SelectedMeeting | null,
  data: {items: readonly CachedItem[]; inbox: ProjectFileState | null; inboxPath: string | null; settings: GtdParaSettings | null},
  mode: EditMode,
  base: Base,
  screenDestination: Destination,
  toCard: () => void,
): MeetingContextSlot {
  const entry = useMemo(
    () => (selected ? {item: {kind: selected.item.kind, name: selected.item.name, path: selected.item.path, abbrev: selected.item.abbrev}, meetingIndex: selected.meetingIndex, meeting: selected.meeting} : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.item.path, selected?.meetingIndex, selected?.meeting],
  );
  const context = useMeetingContext(entry, data);
  const add = useMeetingQuickAdd(entry, context.model?.owner ?? null, base, toCard);
  const adding = mode === 'add' && add !== null;

  const todoActions = useEntryActions('MeetingContext');
  const todoEdit = todoActions.edit;
  const selectedKey = todoEdit.target?.key ?? null;
  const selectedTodo = selectedKey ? panelTodos(context).find(t => panelTodoKey(t) === selectedKey) ?? null : null;
  const entryKey = entry ? `${entry.item.path}#${entry.meetingIndex}` : null;
  // Another meeting, or none: the panel's selection ends.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => todoEdit.cancel(), [entryKey]);
  const backToMeeting = useStableCallback(() => todoEdit.cancel());
  const todoCard = useTodoCard(todoActions.todoCardOptions(selectedTodo, {onClose: backToMeeting}));
  const saveTodo = useStableCallback(async (line: string, linkedFile: string) => {
    if (!selectedTodo) return false;
    const ok = await todoActions.commitTaskEdit(selectedTodo, line, linkedFile);
    if (ok !== false) todoEdit.cancel();
    return ok;
  });
  const taskForWidget = useMemo(
    () => (selectedTodo ? {...selectedTodo.task, text: displayTaskText(selectedTodo.task, 'flat')} : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTodo?.task],
  );
  const onSelectTodo = useStableCallback((todo: OwnerTodoRef) => {
    if (mode !== 'card') toCard();
    todoEdit.select({type: 'task', key: panelTodoKey(todo)});
  });
  const todoOverride: TodoOverride | null =
    selectedTodo && taskForWidget
      ? {
          editTarget: editTargetFor(`panel:${selectedKey}`, {task: taskForWidget}, todoEdit.mode === 'edit' ? 'edit' : 'card'),
          todoCard,
          meetingCard: null,
          onSaveEditTask: saveTodo,
          onSaveEditMeeting: undefined,
          onCancelEdit: backToMeeting,
          onDeleteEdit: undefined,
          onQuickFile: undefined,
          editingItemPath: selectedTodo.item.kind === 'inbox' ? null : selectedTodo.item.path,
          linkedFileMissing: false,
        }
      : null;
  // Stable for the memoized QuickAddWidget; called from its handlers only.
  const onAddTask = useStableCallback((line: string, destination: Destination) => (adding && add ? add.onAddTask(line, destination) : base.addTask(line, destination)));
  const onAddMeeting = useStableCallback((fields: MeetingQuickAddFields, destination: Destination) =>
    adding && add ? add.onAddMeeting(fields, destination) : base.addMeeting(fields, destination),
  );
  return {
    ...context,
    entry,
    adding,
    widget: {
      fixedDestination: adding && add ? add.destination : screenDestination,
      provenance: adding && add ? add.provenance : undefined,
      onAddTask,
      onAddMeeting,
      addToName: adding && entry ? entry.item.name : undefined,
      showTodoKey: adding && entryKey ? `add:${entryKey}` : null,
    },
    todoActions,
    selectedTodoKey: selectedTodo ? selectedKey : null,
    onSelectTodo,
    todoOverride,
  };
}
