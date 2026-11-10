/**
 * What the count tabs over a todo list hold
 * (docs/dev/history/technical-design-calmer-screens.md §3.5): which todos go
 * under which tab, how many each tab counts and how many are due (the bell).
 * Pure; the screens keep the chosen tab (ui/listTabStore.ts) and the todos
 * ticked on this screen (ui/useJustDone.ts).
 *
 * A todo ticked done on this screen ("just done") stays in its tab, struck
 * through, until the tab changes or the screen is left; it is counted under
 * Done only. Counts are open todos.
 */
import {doneWithin} from './flowState';
import {Task} from './types';

export type DailyTab = 'next' | 'waiting' | 'inbox' | 'done';
export type CurrentTab = 'next' | 'waiting' | 'plan' | 'someday' | 'done';

/** How many days Current's Done tab looks back. */
export const CURRENT_DONE_DAYS = 14;

export interface TabSplit<K extends string, E> {
  lists: Record<K, E[]>;
  counts: Record<K, number>;
  /** Due today or earlier, per tab (only Waiting and Inbox carry a bell). */
  bells: Partial<Record<K, number>>;
}

interface DailyEntry {
  task: Task;
  item: {kind: string};
}

/**
 * Daily's tabs. `shown`: the todos Daily's rule shows (just-done ones
 * included, struck); `doneToday`: every todo done today, the Inbox's
 * included. Next is the rule minus Waiting For; Waiting is the waiting rule;
 * Inbox the Inbox's own todos (`inboxInNext`: they show under Next as well).
 */
export function splitDaily<E extends DailyEntry>(shown: readonly E[], doneToday: readonly E[], today: string, inboxInNext: boolean): TabSplit<DailyTab, E> {
  const next: E[] = [];
  const waiting: E[] = [];
  const inbox: E[] = [];
  for (const entry of shown) {
    const isInbox = entry.item.kind === 'inbox';
    if (isInbox) inbox.push(entry);
    if (isInbox && !inboxInNext) continue;
    if (entry.task.flowState === 'waiting-for') waiting.push(entry);
    else next.push(entry);
  }
  const open = (list: E[]) => list.filter(e => !e.task.done).length;
  const due = (list: E[]) => list.filter(e => !e.task.done && e.task.dueDate !== null && e.task.dueDate <= today).length;
  return {
    lists: {next, waiting, inbox, done: [...doneToday]},
    counts: {next: open(next), waiting: open(waiting), inbox: open(inbox), done: doneToday.length},
    bells: {waiting: due(waiting), inbox: due(inbox)},
  };
}

/** The tab an open todo belongs to on the Current page. */
export function currentTabOf(task: Task): Exclude<CurrentTab, 'done'> {
  switch (task.flowState) {
    case 'next':
      return 'next';
    case 'waiting-for':
      return 'waiting';
    case 'someday':
    case 'maybe':
      return 'someday';
    default:
      return 'plan';
  }
}

/**
 * The Current page's tabs, as indexes into `tasks` (file order). Done: done
 * within the last CURRENT_DONE_DAYS days. A just-done todo (`justDone`, by
 * index) also stays in its flow state's tab.
 */
export function splitCurrent(tasks: readonly Task[], today: string, justDone: ReadonlySet<number>): TabSplit<CurrentTab, number> {
  const lists: Record<CurrentTab, number[]> = {next: [], waiting: [], plan: [], someday: [], done: []};
  tasks.forEach((task, index) => {
    if (task.cancelled) return;
    if (task.done) {
      if (justDone.has(index)) lists[currentTabOf(task)].push(index);
      if (doneWithin(task, today, CURRENT_DONE_DAYS)) lists.done.push(index);
      return;
    }
    lists[currentTabOf(task)].push(index);
  });
  const open = (list: number[]) => list.filter(i => !tasks[i].done).length;
  return {
    lists,
    counts: {next: open(lists.next), waiting: open(lists.waiting), plan: open(lists.plan), someday: open(lists.someday), done: lists.done.length},
    bells: {},
  };
}
