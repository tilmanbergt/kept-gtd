/**
 * Cross-project aggregation for the Daily view (design-overview.md §5.2).
 *
 * A pure, synchronous transform over whatever storage/dataCache.ts already
 * has loaded in memory - no filesystem I/O here, so this stays fast however
 * many Projects/Areas exist. Keeping the cache warm is dataCache.ts's job.
 *
 * Scope (docs/dev/history/technical-design-daily-todo-filter.md): an open (not done,
 * not cancelled) task shows here if its due date is today, tomorrow, or
 * earlier (`dueDate <= tomorrowDate` covers all three), OR it's tagged #next
 * (a retired `#now` reads as #next). The active context, not focus, decides
 * which Projects and Areas show (docs/dev/history/technical-design-time-and-place.md
 * §3.5, D26). A task tagged Someday or Maybe (technical-design-tags.md §3) is excluded
 * outright. A Waiting For task has its own rule
 * (docs/dev/history/technical-design-waiting-for-0.7.md W1): it shows when it has no
 * date or its date is today or earlier - from any Project, Area or the
 * Inbox - and stays hidden while its date is still in the
 * future (domain/flowState.ts's isWaitingForShownOnDaily). Meetings: today
 * or tomorrow, not cancelled, soonest first.
 *
 * Inbox (docs/dev/history/technical-design-inbox-tab.md §3): Inbox.txt's own
 * tasks/meetings are folded into this same aggregate - a synthetic
 * `DailyItemRef` (INBOX_ITEM below) stands in for "the Project/Area this came
 * from", so Inbox entries flow through the same grouping/labeling code
 * (groupDailyTasksByItem, the Calendar column's source subtext). An Inbox
 * #next task shows like any other, and the context never hides it; its
 * due-date leg is the same `<= tomorrowDate`. Inbox meetings use the same
 * today/tomorrow rule.
 *
 * Context tags (technical-design-context-tags.md §6): the optional
 * `contextTag` param below is a *hard* filter - when set, every rule above is
 * replaced for that call: only tasks/meetings whose `tags` include it show.
 * Among those matches, every open task qualifies whatever its flow state or
 * date (Waiting For with a future date and Someday included) - only Maybe
 * never qualifies. Meetings keep their today/tomorrow/not-cancelled checks,
 * ANDed with the tag match.
 *
 * Project/Area-aware (docs/dev/history/technical-design-project-area-abbreviations.md):
 * before filtering, `contextTag` is resolved against `items`' own abbrevs
 * (domain/abbrev.ts's resolveAbbrevPath, case-insensitive). When it
 * resolves, the tag-match condition becomes a union - a task/meeting counts
 * if it carries the literal tag OR belongs to that resolved item, so every
 * task and meeting of a Project/Area shows under its `#AT` filter even when
 * not tagged `#AT` itself. When `contextTag` matches no abbrev, the tag-only
 * behavior above applies. Never reaches the synthetic Inbox item - Inbox has
 * no abbrev, so `contextItemPath` can never equal `inboxPath`.
 *
 * The active context (docs/dev/history/technical-design-time-and-place.md
 * §3.3, domain/contexts.ts) applies on top, as `matcher`: a todo the rule
 * above lets through but the context hides goes to `hiddenTasks` (the
 * hidden line counts them, due ones as "3 due!"); the Inbox always passes. Meetings are never hidden, only marked `contextState: 'dimmed'`.
 */
import {entriesInRange, entryDate, MeetingSpanDay} from '../domain/meetingSpan';
import {resolveAbbrevPath} from '../domain/abbrev';
import {isWaitingForShownOnDaily} from '../domain/flowState';
import {isoDateOffset, meetingTimestampMs, todayIso} from '../domain/meetingTime';
import {GtdParaKind, Meeting, Task} from '../domain/types';
import {ContextItem, ContextMatcher, MeetingContextState} from '../domain/contexts';
import {CachedItem} from './dataCache';
import {perfTime} from '../utils/perf';

export interface DailyItemRef {
  kind: GtdParaKind;
  name: string;
  path: string;
  /** This item's short abbreviation (docs/dev/history/technical-design-project-area-abbreviations.md), carried through from CachedItem - what the Calendar column's trailing badge (ui/MeetingRow.tsx) displays instead of the full name. Always null for the synthetic Inbox item below - Inbox isn't a Project/Area and has no abbrev of its own. */
  abbrev: string | null;
}

/** The synthetic "source item" Inbox tasks/meetings carry - see the module doc comment's "Inbox" note. `path` is `inboxPath` itself, the same address storage/projectFile.ts's loadProjectFile('inbox', inboxPath) uses. */
export function inboxItemRef(inboxPath: string): DailyItemRef {
  return {kind: 'inbox', name: 'Inbox', path: inboxPath, abbrev: null};
}

export interface DailyTaskEntry {
  item: DailyItemRef;
  /** Index into that item's *full* tasks array (CachedItem.tasks) - needed to write a toggle back with saveTasks + updateItemTasks. */
  taskIndex: number;
  task: Task;
}

export interface DailyMeetingEntry {
  item: DailyItemRef;
  meetingIndex: number;
  meeting: Meeting;
  /** Set only for a multi-day meeting - which covered day (today or tomorrow) this entry stands for; see storage/weeklyAggregate.ts's entriesInRange. */
  span?: MeetingSpanDay;
  /** 'dimmed' when the active context leaves the meeting out (domain/contexts.ts); absent = shown. */
  contextState?: MeetingContextState;
}

export interface DailyAggregate {
  /** Open tasks matching the rule (see the module doc comment), in no particular order. */
  tasks: DailyTaskEntry[];
  /** Meetings dated today or tomorrow, not cancelled, soonest first. */
  meetings: DailyMeetingEntry[];
  /** Items whose data file failed to load on the last cache build - reported, not silently dropped from the rest of the aggregate. */
  failedItems: Array<{item: DailyItemRef; error: string}>;
  /** Todos the rule shows but the active context hides (empty without a matcher). */
  hiddenTasks?: DailyTaskEntry[];
}

/** Just the two arrays buildDailyAggregate needs from Inbox.txt - storage/projectFile.ts's ProjectFileState carries more than this, callers pass just these two fields. `null` when Inbox hasn't loaded yet (same "not loaded yet" gap DailyView's own handlers already guard against elsewhere). */
export interface DailyInboxInput {
  tasks: Task[];
  meetings: Meeting[];
}

/** Pure in-memory aggregation over already-cached items plus Inbox.txt's own tasks/meetings - see the module doc comment. `inboxPath` addresses the synthetic Inbox item (inboxItemRef above); ignored when `inbox` is null. */
function buildDailyAggregateImpl(
  items: CachedItem[],
  inbox: DailyInboxInput | null,
  inboxPath: string,
  now: Date = new Date(),
  contextTag: string | null = null,
  matcher: ContextMatcher | null = null,
): DailyAggregate {
  const todayDate = todayIso(now);
  const tomorrowDate = isoDateOffset(1, now);
  // See the module doc comment's "Project/Area-aware" note.
  const contextItemPath = contextTag ? resolveAbbrevPath(contextTag, items) : null;

  const shownTasks: DailyTaskEntry[] = [];
  const hiddenTasks: DailyTaskEntry[] = [];
  const meetings: DailyMeetingEntry[] = [];
  const failedItems: DailyAggregate['failedItems'] = [];
  // Every todo the rule lets through passes the context here.
  const tasks = {
    push(entry: DailyTaskEntry) {
      const owner = !matcher ? null : entry.item.kind === 'inbox' ? 'inbox' : contextItemOf(items, entry.item.path);
      if (!matcher || owner === null || matcher.taskShown(owner, entry.task, todayDate)) shownTasks.push(entry);
      else hiddenTasks.push(entry);
    },
  };
  const withState = (entries: DailyMeetingEntry[], owner: ContextItem | 'inbox'): DailyMeetingEntry[] => {
    if (!matcher) return entries;
    return entries.map(e => (matcher.meetingState(owner, e.meeting) === 'dimmed' ? {...e, contextState: 'dimmed' as const} : e));
  };

  for (const cachedItem of items) {
    const item: DailyItemRef = {
      kind: cachedItem.kind,
      name: cachedItem.name,
      path: cachedItem.path,
      abbrev: cachedItem.abbrev,
    };

    if (cachedItem.loadError) {
      failedItems.push({item, error: cachedItem.loadError});
      continue;
    }

    const inContextItem = contextItemPath !== null && cachedItem.path === contextItemPath;

    cachedItem.tasks.forEach((task, taskIndex) => {
      if (task.done || task.cancelled) return;
      if (contextTag) {
        // Hard filter, replacing the normal rule below entirely - see the
        // module doc comment's "Context tags" note. Widened to a union with
        // `inContextItem` when the tag resolved to a Project/Area (the
        // "Project/Area-aware" note) - Maybe still never qualifies, tag/
        // item match or not; Waiting For/Someday become eligible here,
        // unlike the normal rule just below.
        if ((!task.tags.includes(contextTag) && !inContextItem) || task.flowState === 'maybe') return;
        tasks.push({item, taskIndex, task});
        return;
      }
      // Someday / Maybe never show on Daily; Waiting For has its own rule
      // (no date or date reached, any item) - see the module doc comment.
      // Both checks win over the inclusion rule below.
      if (task.flowState === 'someday' || task.flowState === 'maybe') return;
      if (task.flowState === 'waiting-for') {
        if (isWaitingForShownOnDaily(task, todayDate)) tasks.push({item, taskIndex, task});
        return;
      }
      const isDueSoonOrOverdue = task.dueDate !== null && task.dueDate <= tomorrowDate;
      if (isDueSoonOrOverdue || task.flowState === 'next') {
        tasks.push({item, taskIndex, task});
      }
    });
    cachedItem.meetings.forEach((meeting, meetingIndex) => {
      if (contextTag && !meeting.tags.includes(contextTag) && !inContextItem) return;
      // Multi-day meetings show on every covered day (one entry per day).
      if (!meeting.cancelled) meetings.push(...withState(entriesInRange({item, meetingIndex, meeting}, todayDate, tomorrowDate), cachedItem));
    });
  }

  if (inbox) {
    const item = inboxItemRef(inboxPath);
    inbox.tasks.forEach((task, taskIndex) => {
      if (task.done || task.cancelled) return;
      if (contextTag) {
        if (!task.tags.includes(contextTag) || task.flowState === 'maybe') return;
        tasks.push({item, taskIndex, task});
        return;
      }
      if (task.flowState === 'someday' || task.flowState === 'maybe') return;
      if (task.flowState === 'waiting-for') {
        if (isWaitingForShownOnDaily(task, todayDate)) tasks.push({item, taskIndex, task});
        return;
      }
      // Same rule as the main loop above.
      const isNext = task.flowState === 'next';
      const isDueSoonOrOverdue = task.dueDate !== null && task.dueDate <= tomorrowDate;
      if (isNext || isDueSoonOrOverdue) {
        tasks.push({item, taskIndex, task});
      }
    });
    inbox.meetings.forEach((meeting, meetingIndex) => {
      if (contextTag && !meeting.tags.includes(contextTag)) return;
      // Multi-day meetings show on every covered day (one entry per day).
      if (!meeting.cancelled) meetings.push(...entriesInRange({item, meetingIndex, meeting}, todayDate, tomorrowDate));
    });
  }

  meetings.sort((a, b) => meetingTimestampMs(a.meeting, now) - meetingTimestampMs(b.meeting, now));

  return {tasks: shownTasks, meetings, failedItems, hiddenTasks};
}

/** The Project or Area at `path` as the context matcher reads it. */
function contextItemOf(items: readonly CachedItem[], path: string): ContextItem | null {
  return items.find(i => i.path === path) ?? null;
}

/** The day a Daily meeting entry is listed under - its covered day for a multi-day meeting, else its date. */
export function dailyEntryDate(entry: DailyMeetingEntry): string {
  return entryDate(entry);
}

export interface DailyTaskGroup {
  item: DailyItemRef;
  entries: DailyTaskEntry[];
}

/**
 * Groups an already-built DailyAggregate's tasks by source Project/Area
 * (technical-design-daily-compact-ui.md §3). Group order: the Inbox group
 * (docs/dev/history/technical-design-inbox-tab.md §3) always sorts first when
 * present - not-yet-triaged items get visual priority. After that, arrival
 * order (Array.prototype.sort is stable). Within a group, task order is the order
 * buildDailyAggregate produced (file order), except that Waiting For todos
 * move to the end of their group.
 */
function groupDailyTasksByItemImpl(entries: DailyTaskEntry[]): DailyTaskGroup[] {
  const byPath = new Map<string, DailyTaskGroup>();
  for (const entry of entries) {
    let group = byPath.get(entry.item.path);
    if (!group) {
      group = {item: entry.item, entries: []};
      byPath.set(entry.item.path, group);
    }
    group.entries.push(entry);
  }
  // Waiting For todos go last inside their group (docs/dev/technical-design-
  // waiting-for-0.7.md W2) - stable sort, so everything else keeps its order.
  // taskIndex is untouched, so every row action still hits the right task.
  const isWaiting = (entry: DailyTaskEntry) => Number(entry.task.flowState === 'waiting-for');
  for (const group of byPath.values()) group.entries.sort((a, b) => isWaiting(a) - isWaiting(b));
  return Array.from(byPath.values()).sort((a, b) => {
    if (a.item.kind === 'inbox' && b.item.kind !== 'inbox') return -1;
    if (b.item.kind === 'inbox' && a.item.kind !== 'inbox') return 1;
    return 0;
  });
}

/** Perf-traced entry point (docs/dev/history/technical-design-perf-tracing.md) - see buildDailyAggregateImpl above for the actual logic. */
export function buildDailyAggregate(...args: Parameters<typeof buildDailyAggregateImpl>): ReturnType<typeof buildDailyAggregateImpl> {
  return perfTime('agg:daily', () => buildDailyAggregateImpl(...args));
}

/** Perf-traced entry point (docs/dev/history/technical-design-perf-tracing.md) - see groupDailyTasksByItemImpl above for the actual logic. */
export function groupDailyTasksByItem(...args: Parameters<typeof groupDailyTasksByItemImpl>): ReturnType<typeof groupDailyTasksByItemImpl> {
  return perfTime('agg:groupDailyTasks', () => groupDailyTasksByItemImpl(...args));
}
