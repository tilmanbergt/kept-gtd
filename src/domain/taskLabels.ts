/**
 * The text labels a todo row shows after its title - `#next`, `#now`,
 * `#w/f Meier`, `#due 5.10.` (docs/dev/technical-design-waiting-
 * for-0.7.md §3.2). Pure, no React Native - one definition every todo row
 * (ui/TaskRow.tsx) reads, so what a label says never drifts between Daily,
 * Inbox, Current and Review.
 *
 * `context` says whether the list is grouped by flow state:
 * - 'flat' (Daily, Review's Inbox step): nothing else on screen says a todo is
 *   Next or Waiting For, so the label does.
 * - 'grouped' (grouped lists such as the overviews'): the section heading
 *   already names the flow state, so the label leaves it out. A waiting
 *   name still shows - the heading doesn't say who.
 *
 * - 'quiet' (Daily, Current; docs/dev/history/technical-design-calmer-screens.md
 *   §3.4): no labels in the title; the title keeps its words and free tags,
 *   only `#next`/`#now`, the due field and the `#wf…` tag leave it, and
 *   `quietMeta` says the one thing that matters on the right ("due 5.11.",
 *   "w/f Marco").
 *
 * `displayTaskText` removes exactly the tags a label (or the heading) already
 * shows from the title, so nothing appears twice. `task.text` itself is never
 * changed - this is display only.
 */
import {formatDate} from './dateFormat';
import {setFlowStateTag, titleCaseSlug, withoutNow} from './flowState';
import {setDueInLine} from './markdown';
import {Task} from './types';

/** 'inbox': a quiet row on Daily's Inbox tab, whose grey note is when it was captured (domain/inboxCount.ts). */
export type TaskLabelContext = 'flat' | 'grouped' | 'quiet' | 'inbox';

export type TaskLabelKind = 'next' | 'waiting' | 'due' | 'overdue';

export interface TaskLabel {
  kind: TaskLabelKind;
  text: string;
}

/** Longest waiting name shown in a label before it is shortened with "…". */
export const WAITING_NAME_MAX_CHARS = 20;

function waitingLabel(task: Task): string {
  if (!task.waitingOn) return '#w/f';
  const name = titleCaseSlug(task.waitingOn);
  const short = name.length > WAITING_NAME_MAX_CHARS ? `${name.slice(0, WAITING_NAME_MAX_CHARS - 1).trimEnd()}…` : name;
  return short ? `#w/f ${short}` : '#w/f';
}

/** The labels for `task`, flow state first, then due date. */
export function taskLabels(task: Task, context: TaskLabelContext, today: string): TaskLabel[] {
  const labels: TaskLabel[] = [];
  if (context === 'quiet' || context === 'inbox') return labels;
  if (context === 'flat') {
    if (task.flowState === 'next') labels.push({kind: 'next', text: '#next'});
    if (task.flowState === 'waiting-for') labels.push({kind: 'waiting', text: waitingLabel(task)});
  } else if (task.flowState === 'waiting-for' && task.waitingOn) {
    labels.push({kind: 'waiting', text: waitingLabel(task)});
  }
  if (task.dueDate) {
    const overdue = task.dueDate < today;
    labels.push(
      overdue
        ? {kind: 'overdue', text: `#due ${formatDate(task.dueDate, today)} !`}
        : {kind: 'due', text: `#due ${formatDate(task.dueDate, today)}`},
    );
  }
  return labels;
}

/**
 * Whether `task`'s flow state is already shown by a label or by its section
 * heading - then its tag is left out of the title. Mirrors `taskLabels`: in
 * a grouped list the heading always shows it; in a flat list Next and
 * Waiting For always get a label, Someday and Maybe never.
 */
export function isFlowStateConveyed(task: Task, context: TaskLabelContext): boolean {
  if (!task.flowState) return false;
  if (context === 'grouped') return true;
  if (context === 'quiet' || context === 'inbox') return task.flowState === 'next' || task.flowState === 'waiting-for';
  return task.flowState === 'next' || task.flowState === 'waiting-for';
}

/**
 * `task.text` without the tags its labels (or heading) already show: the due
 * tag always (its label always shows), the flow-state tag when conveyed -
 * for Next also a retired `#now`, which reads as `#next`.
 */
export function displayTaskText(task: Task, context: TaskLabelContext): string {
  const withoutDue = task.dueDate ? setDueInLine(task.text, null) : task.text;
  const withoutFlowState = isFlowStateConveyed(task, context)
    ? setFlowStateTag(withoutDue, null)
    : withoutDue;
  const nextConveyed = task.flowState === 'next' && isFlowStateConveyed(task, context);
  return nextConveyed ? withoutNow(withoutFlowState) : withoutFlowState;
}

/** A quiet row's note on the right (§3.4): `strong` for what is due today or overdue. */
export interface QuietMeta {
  text: string;
  strong: boolean;
}

/** `due today` / `overdue 3.11.` (both strong) / `due 5.11.` / `w/f Marco` / `w/f` / null - the due date first. */
export function quietMeta(task: Task, today: string): QuietMeta | null {
  if (task.dueDate && !task.done) {
    if (task.dueDate === today) return {text: 'due today', strong: true};
    if (task.dueDate < today) return {text: `overdue ${formatDate(task.dueDate, today)}`, strong: true};
    return {text: `due ${formatDate(task.dueDate, today)}`, strong: false};
  }
  if (task.flowState === 'waiting-for') {
    const label = waitingLabel(task);
    return {text: label.replace(/^#/, ''), strong: false};
  }
  return null;
}
