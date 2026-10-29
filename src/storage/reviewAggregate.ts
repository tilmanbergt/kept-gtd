/**
 * Cross-project aggregation for the Weekly Review flow (screens/ReviewScreen.tsx),
 * mirroring storage/dailyAggregate.ts's own pattern exactly: a pure,
 * synchronous transform over whatever storage/dataCache.ts already has
 * loaded in memory - no filesystem I/O here, so this is effectively
 * instant regardless of how many Projects/Areas exist. Getting the cache
 * warm is dataCache.ts's job, not this file's (design-overview.md §3's
 * "read the already-warm cache" rule).
 *
 * Inbox.txt is deliberately NOT covered here, same as dailyAggregate.ts -
 * it's a single flat file outside storage/dataCache.ts's `items` array, so
 * ReviewScreen loads it directly (loadProjectFile('inbox', inboxPath)),
 * same as DailyView already does for its own Inbox section.
 *
 * Scope, one bucket per Weekly Review step that needs cross-project data
 * (steps that only touch one item at a time - status/archive/focus actions -
 * don't need an aggregate entry, they read/write CachedItem directly):
 * - weekMeetings: every not-cancelled meeting that touches the week the
 *   "Week ahead" step shows (domain/weekDate.ts's weekAheadRangeIso: this
 *   week, or next week from Friday to Sunday) - once per meeting, also when
 *   a multi-day meeting started before that week. Sorted soonest first.
 *   Only its length is used, as the hub's count; the step itself is
 *   screens/ReviewWeekAhead.tsx.
 * - stalledProjects: Active projects with zero *actionable* open tasks -
 *   a next action (`#next`/`#now`) or Waiting For (real, if blocked,
 *   follow-up); a plan todo (no flow state) or one shelved to Someday/Maybe
 *   is no next action (docs/dev/history/technical-design-engage.md, Addendum
 *   "Plan across the app"). Each stalled entry carries its own
 *   next-2-upcoming-meetings (not bounded to the week-ahead window above - a
 *   stalled project's only near-term touchpoint might be three weeks out,
 *   and that's still worth surfacing) AND its own `shelvedTasks` - the Plan,
 *   Someday and Maybe todos the "is it stalled" check leaves out - so the
 *   Stalled Projects step can show them, with a quick way to promote one to
 *   Next right there.
 * - doneProjects: projects at status 'done' - Areas never reach this status
 *   (domain/types.ts's ItemStatus doc comment), so this is projects only.
 * - onHoldItems: Projects AND Areas at status 'on-hold', kind on each entry
 *   distinguishes them - Weekly Review's On Hold step reviews both kinds
 *   together.
 * - neglectedAreas: the Areas counterpart of stalledProjects, same
 *   rule and shelvedTasks treatment.
 * - meetingsToClose (docs/dev/history/technical-design-meeting-tracking.md): meetings whose
 *   Note setup tracks "review after", that are over, not yet `#reviewed`, and
 *   within the last REVIEW_LOOKBACK_DAYS. The predicate is domain/
 *   meetingTracking.ts's `isReviewOutstanding` - the same resolution the Daily
 *   row's icon uses, so the two can't disagree. Needs the Note setups
 *   (`noteSetups`), which are settings, not item data, so the caller passes
 *   them in (none -> nothing tracked -> empty bucket).
 * - somedayItems (docs/dev/history/technical-design-engage-in-context.md
 *   §2.10): active and on-hold Projects/Areas with open Someday/Maybe todos,
 *   for the "Someday / Maybe" step; archived items are never in the cache.
 */
import {ContextMatcher} from '../domain/contexts';
import {AgreementReviewGroup, agreementsToReview as reviewAgreements} from '../domain/agreementReview';
import {NoteSetup} from '../domain/noteSetups';
import {engageSourceOf} from './engageAggregate';
import {isSomedayMaybe} from '../domain/flowState';
import {countMeetingsInRange} from '../domain/meetingSpan';
import {meetingTimestampMs, splitAndSortMeetings, todayIso} from '../domain/meetingTime';
import {isReviewOutstanding} from '../domain/meetingTracking';
import {EMPTY_NOTE_SETUP_CONFIG, NoteSetupConfig} from '../domain/noteSetups';
import {ReviewStepId} from '../domain/reviewSteps';
import {Meeting, Task} from '../domain/types';
import {weekAheadRangeIso} from '../domain/weekDate';
import {CachedItem} from './dataCache';

export interface ReviewItemRef {
  kind: 'project' | 'area';
  name: string;
  path: string;
}

export interface ReviewMeetingEntry {
  item: ReviewItemRef;
  /** Index into that item's *full* meetings array (CachedItem.meetings). */
  meetingIndex: number;
  meeting: Meeting;
}

export interface ReviewShelvedTaskEntry {
  item: ReviewItemRef;
  /** Index into that item's *full* tasks array (CachedItem.tasks) - needed to write a flow-state promotion back with saveTasks + updateItemTasks, same shape storage/dailyAggregate.ts's DailyTaskEntry already uses. */
  taskIndex: number;
  task: Task;
}

export interface ReviewProjectEntry {
  item: ReviewItemRef;
  /** Up to 2 nearest not-cancelled upcoming meetings for this item, any date - not bounded to weekMeetings' week. */
  upcomingMeetings: ReviewMeetingEntry[];
  /** This item's own open Plan, Someday and Maybe todos - left out of the stalled/neglected check itself (see the module doc comment) but surfaced here so the UI can offer a one-tap promote-to-Next. */
  shelvedTasks: ReviewShelvedTaskEntry[];
}

export interface ReviewNextTaskEntry {
  item: ReviewItemRef;
  /** Index into that item's *full* tasks array (CachedItem.tasks) - same convention as ReviewShelvedTaskEntry. */
  taskIndex: number;
  task: Task;
}

export interface ReviewSomedayEntry {
  item: ReviewItemRef;
  /** This item's own open Someday/Maybe todos - see somedayTasksFor. */
  tasks: ReviewNextTaskEntry[];
}

export interface ReviewAggregate {
  weekMeetings: ReviewMeetingEntry[];
  stalledProjects: ReviewProjectEntry[];
  doneProjects: ReviewItemRef[];
  onHoldItems: ReviewItemRef[];
  neglectedAreas: ReviewProjectEntry[];
  /** Open Someday/Maybe todos of active and on-hold Projects/Areas, per item in file order (docs/dev/history/technical-design-engage-in-context.md §2.10). */
  somedayItems: ReviewSomedayEntry[];
  /** Past meetings still owing their tracked review, most recent first - see the module doc comment's "meetingsToClose" note. */
  meetingsToClose: ReviewMeetingEntry[];
  /** Items whose data file failed to load on the last cache build - reported, not silently dropped, same as dailyAggregate.ts. */
  failedItems: Array<{item: ReviewItemRef; error: string}>;
}

const NEXT_MEETINGS_LIMIT = 2;

function nextUpcomingMeetings(item: ReviewItemRef, meetings: Meeting[], now: Date): ReviewMeetingEntry[] {
  const indexed = meetings
    .map((meeting, index) => ({meeting, index}))
    .filter(({meeting}) => !meeting.cancelled);
  const {upcoming} = splitAndSortMeetings(indexed, now.getTime());
  return upcoming.slice(0, NEXT_MEETINGS_LIMIT).map(({meeting, index}) => ({item, meetingIndex: index, meeting}));
}

/**
 * Open and moving: a next action (`#next`, `#now`) or Waiting For. A plan
 * todo (no flow state) is no next action, Someday/Maybe are shelved
 * (docs/dev/history/technical-design-engage.md, Addendum "Plan across the
 * app"). An item without one is stalled. Exported so screens/ReviewScreen.tsx
 * and storage/projectGlance.ts apply the exact same rule, instead of
 * drifting from this file's own definition.
 */
export function isActionableOpenTask(task: Task): boolean {
  return !task.done && !task.cancelled && (task.flowState === 'next' || task.flowState === 'waiting-for');
}

const NOT_NEXT_ORDER = [null, 'someday', 'maybe'];

/**
 * This item's own open todos that are not next: the Plan, then Someday, then
 * Maybe, each in file order - for ReviewProjectEntry.shelvedTasks.
 * Exported for the same reason as isActionableOpenTask above - ReviewScreen.tsx
 * reuses this to keep a frozen card's shelved-task list live (e.g. so a
 * just-promoted task disappears from it immediately, rather than only after
 * the card itself next re-freezes).
 */
export function shelvedTasksFor(item: ReviewItemRef, tasks: Task[]): ReviewShelvedTaskEntry[] {
  return tasks
    .map((task, taskIndex) => ({item, taskIndex, task}))
    .filter(({task}) => !task.done && !task.cancelled && !isActionableOpenTask(task))
    .sort((a, b) => NOT_NEXT_ORDER.indexOf(a.task.flowState) - NOT_NEXT_ORDER.indexOf(b.task.flowState));
}

/** This item's own open Someday/Maybe todos, file order - the "Someday / Maybe" step's rows, recomputed live like nextTasksFor. */
export function somedayTasksFor(item: ReviewItemRef, tasks: Task[]): ReviewNextTaskEntry[] {
  return tasks.map((task, taskIndex) => ({item, taskIndex, task})).filter(({task}) => !task.done && !task.cancelled && isSomedayMaybe(task));
}

/** Pure in-memory aggregation over already-cached items - see the module doc comment. */
export function buildReviewAggregate(
  items: CachedItem[],
  now: Date = new Date(),
  noteSetups: NoteSetupConfig = EMPTY_NOTE_SETUP_CONFIG,
): ReviewAggregate {
  const week = weekAheadRangeIso(now);

  const weekMeetings: ReviewMeetingEntry[] = [];
  const stalledProjects: ReviewProjectEntry[] = [];
  const doneProjects: ReviewItemRef[] = [];
  const onHoldItems: ReviewItemRef[] = [];
  const neglectedAreas: ReviewProjectEntry[] = [];
  const meetingsToClose: ReviewMeetingEntry[] = [];
  const somedayItems: ReviewSomedayEntry[] = [];
  const failedItems: ReviewAggregate['failedItems'] = [];

  for (const cachedItem of items) {
    const item: ReviewItemRef = {kind: cachedItem.kind, name: cachedItem.name, path: cachedItem.path};

    if (cachedItem.loadError) {
      failedItems.push({item, error: cachedItem.loadError});
      continue;
    }

    cachedItem.meetings.forEach((meeting, meetingIndex) => {
      if (countMeetingsInRange([meeting], week.start, week.end) > 0) {
        weekMeetings.push({item, meetingIndex, meeting});
      }
      if (isReviewOutstanding(meeting, noteSetups, now)) {
        meetingsToClose.push({item, meetingIndex, meeting});
      }
    });

    if (cachedItem.kind === 'project' && cachedItem.status === 'done') {
      doneProjects.push(item);
    }
    if (cachedItem.status === 'on-hold') {
      onHoldItems.push(item);
    }
    if (cachedItem.status === 'active' || cachedItem.status === 'on-hold') {
      const tasks = somedayTasksFor(item, cachedItem.tasks);
      if (tasks.length > 0) somedayItems.push({item, tasks});
    }

    if (cachedItem.status === 'active') {
      const hasOpenTask = cachedItem.tasks.some(isActionableOpenTask);
      if (!hasOpenTask) {
        const entry: ReviewProjectEntry = {
          item,
          upcomingMeetings: nextUpcomingMeetings(item, cachedItem.meetings, now),
          shelvedTasks: shelvedTasksFor(item, cachedItem.tasks),
        };
        if (cachedItem.kind === 'project') {
          stalledProjects.push(entry);
        } else {
          neglectedAreas.push(entry);
        }
      }
    }
  }

  weekMeetings.sort((a, b) => meetingTimestampMs(a.meeting, now) - meetingTimestampMs(b.meeting, now));

  meetingsToClose.sort((a, b) => meetingTimestampMs(b.meeting, now) - meetingTimestampMs(a.meeting, now));

  return {
    weekMeetings,
    stalledProjects,
    doneProjects,
    onHoldItems,
    neglectedAreas,
    somedayItems,
    meetingsToClose,
    failedItems,
  };
}

/** One step's number on the Review hub. */
export interface ReviewStepCount {
  n: number;
  /** What the active context leaves out of the step: the hub's "+n in other contexts" (Q2). */
  elsewhere?: number;
}

/**
 * The aggregate under the active context (docs/dev/history/technical-design-time-and-place.md
 * §3.3, Q2): each step lists the context's items and todos; meetings to close
 * out keep the ones the context shows. Week ahead keeps every meeting (the
 * Week view dims, never hides). Everything (`matcher.context` null) returns
 * the aggregate itself.
 */
export function filterReviewAggregate(aggregate: ReviewAggregate, matcher: ContextMatcher, items: readonly CachedItem[], now: Date = new Date()): ReviewAggregate {
  if (!matcher.context) return aggregate;
  const byPath = new Map(items.map(i => [i.path, i] as const));
  const shown = (ref: ReviewItemRef) => {
    const item = byPath.get(ref.path);
    return !item || matcher.itemShown(item);
  };
  const today = todayIso(now);
  return {
    ...aggregate,
    stalledProjects: aggregate.stalledProjects.filter(e => shown(e.item)),
    doneProjects: aggregate.doneProjects.filter(shown),
    onHoldItems: aggregate.onHoldItems.filter(shown),
    neglectedAreas: aggregate.neglectedAreas.filter(e => shown(e.item)),
    somedayItems: aggregate.somedayItems
      .map(e => {
        const item = byPath.get(e.item.path);
        return item ? {...e, tasks: e.tasks.filter(t => matcher.taskShown(item, t.task, today))} : e;
      })
      .filter(e => e.tasks.length > 0),
    meetingsToClose: aggregate.meetingsToClose.filter(e => {
      const item = byPath.get(e.item.path);
      return !item || matcher.meetingState(item, e.meeting) === 'shown';
    }),
  };
}

/** `counts` with each step's `elsewhere` set from the counts without the context (`all`). */
export function withElsewhere(counts: Record<ReviewStepId, ReviewStepCount>, all: Record<ReviewStepId, ReviewStepCount>): Record<ReviewStepId, ReviewStepCount> {
  const out = {...counts};
  for (const id of Object.keys(counts) as ReviewStepId[]) {
    const elsewhere = all[id].n - counts[id].n;
    if (elsewhere > 0) out[id] = {...counts[id], elsewhere};
  }
  return out;
}

/**
 * The Review hub's per-step numbers (docs/dev/history/technical-design-review-hub.md
 * §5.2) - "how much is waiting in there", live from the same aggregate the
 * steps themselves read, so the hub and a step can never disagree about
 * membership (the steps' own frozen snapshots only affect what stays visible
 * INSIDE a visit). A Record over every ReviewStepId, so adding a step to
 * domain/reviewSteps.ts fails to compile until it gets a count here.
 *
 * `inboxOpenCount` is passed in because Inbox.txt lives outside the item
 * cache (ReviewScreen loads it directly and already knows which Inbox tasks/
 * meetings are still open). Week ahead counts gtdpara meetings only - Google
 * Calendar events sit in a separate async cache; the Inbox's meetings in
 * that week come in as `weekAheadInboxCount`, for the same reason as
 * `inboxOpenCount`.
 *
 * `gmailInboxCount` is passed in for the same reason `inboxOpenCount` is -
 * the Gmail inbox (storage/gmailInboxCache.ts) is its own module-level
 * cache, entirely outside both the item cache and this function's own
 * `aggregate` parameter, since it comes from IMAP rather than anything on
 * this device's storage.
 */
export function buildReviewStepCounts(
  aggregate: ReviewAggregate,
  inboxOpenCount: number,
  gmailInboxCount: number,
  weekAheadInboxCount = 0,
  tendingCount = 0,
  openLoopsCount = 0,
  agreementsCount = 0,
): Record<ReviewStepId, ReviewStepCount> {
  return {
    weekAhead: {n: aggregate.weekMeetings.length + weekAheadInboxCount},
    meetingsCloseOut: {n: aggregate.meetingsToClose.length},
    // New and active counterparts (docs/dev/history/technical-design-tending-threads.md §3.10).
    tendingThreads: {n: tendingCount},
    // Agreements that need a decision (domain/agreementReview.ts).
    agreements: {n: agreementsCount},
    gmailInbox: {n: gmailInboxCount},
    inbox: {n: inboxOpenCount},
    stalled: {n: aggregate.stalledProjects.length},
    // Loops that need a look (storage/loopRoster.ts).
    openLoops: {n: openLoopsCount},
    done: {n: aggregate.doneProjects.length},
    onHold: {n: aggregate.onHoldItems.length},
    neglected: {n: aggregate.neglectedAreas.length},
    somedayMaybe: {n: aggregate.somedayItems.reduce((sum, entry) => sum + entry.tasks.length, 0)},
  };
}

/**
 * The Review step "Agreements" (docs/dev/history/technical-design-meetings-0.21.md
 * §9, R25): domain/agreementReview.ts over the warm cache, with the Note
 * setups' thread types and loop kinds.
 */
export function agreementsToReview(items: readonly CachedItem[], noteSetups: readonly NoteSetup[], today: string): AgreementReviewGroup[] {
  return reviewAgreements(engageSourceOf(items, null, noteSetups), today);
}
