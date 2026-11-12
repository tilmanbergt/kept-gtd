/**
 * What Daily's Inbox tab lists and counts (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): the open marks, the open Inbox todos (not done, not cancelled, not
 * Someday or Maybe) and the Inbox meetings that are not cancelled, past ones
 * included - in file order. Everything counts; the active context never
 * hides anything here. The bell counts the todos due today or earlier. Pure.
 */
import {formatDate} from './dateFormat';
import {QuietMeta, quietMeta} from './taskLabels';
import {Meeting, Task} from './types';

/** Whether an Inbox todo still needs a place: open, and not parked as Someday or Maybe. */
export function isOpenInboxTodo(task: Task): boolean {
  return !task.done && !task.cancelled && task.flowState !== 'someday' && task.flowState !== 'maybe';
}

/** Whether an Inbox meeting is listed: not cancelled, whenever it is. */
export function isOpenInboxMeeting(meeting: Meeting): boolean {
  return !meeting.cancelled;
}

export interface InboxSummary {
  /** Indexes into the Inbox's tasks, file order. */
  todos: number[];
  /** Indexes into the Inbox's meetings, file order. */
  meetings: number[];
  count: number;
  /** Open todos due today or earlier. */
  bell: number;
}

export function inboxSummary(tasks: readonly Task[], meetings: readonly Meeting[], openMarks: number, today: string): InboxSummary {
  const todos = tasks.map((t, i) => (isOpenInboxTodo(t) ? i : -1)).filter(i => i >= 0);
  const listed = meetings.map((m, i) => (isOpenInboxMeeting(m) ? i : -1)).filter(i => i >= 0);
  const bell = todos.filter(i => tasks[i].dueDate !== null && tasks[i].dueDate! <= today).length;
  return {todos, meetings: listed, count: openMarks + todos.length + listed.length, bell};
}

/** An Inbox row's grey note: a due date today or earlier first (bold), else when it was captured ("2.11."). */
export function inboxTodoMeta(task: Task, today: string): QuietMeta | null {
  const due = quietMeta(task, today);
  if (due?.strong) return due;
  const created = task.fields.created;
  return created ? {text: formatDate(created, today), strong: false} : due;
}

/** An Inbox row in list order: a todo's or a meeting's index in the Inbox file. */
export interface InboxListEntry {
  type: 'task' | 'meeting';
  index: number;
}

/**
 * The row to show after `filed` left the list: the next one, else the one
 * before. `moved`: it left the file too (filed elsewhere), so the rows after
 * it of its kind moved up one index; a todo parked as Someday or removed
 * stays in the file at its place.
 */
export function nextInboxRow(order: readonly InboxListEntry[], filed: InboxListEntry, moved = true): InboxListEntry | null {
  const at = order.findIndex(r => r.type === filed.type && r.index === filed.index);
  const next = at < 0 ? null : order[at + 1] ?? order[at - 1] ?? null;
  if (!next) return null;
  return moved && next.type === filed.type && next.index > filed.index ? {type: next.type, index: next.index - 1} : next;
}

/**
 * A todo ticked on the Inbox list, kept (struck) until the list is left: named by its text and
 * creation date, not its place - filing an earlier item moves every later one up a place.
 */
export function inboxTickKey(task: Pick<Task, 'text' | 'fields'>): string {
  return `${task.text}\u0000${task.fields.created ?? ''}`;
}
