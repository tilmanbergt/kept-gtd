/**
 * Contexts: a named place - Work, Home, Café - that decides what Daily, Week,
 * Month, Projects and Areas show (Review only when narrowed to it). Stored per
 * profile in `settings.contexts`; the active one is `settings.activeContextId`
 * ('' = Everything, built in). Rules: docs/dev/history/technical-design-contexts-tags.md §2.1.
 *
 * - Show has two parts, Where (areas and projects) and What (tags, a loop or
 *   thread type as its root tag). An empty part restricts nothing; with both
 *   filled, an entry shows when it matches either part, or both with
 *   `onlyInPlaces`.
 * - Except (`hides`) always wins.
 * - An Area entry also matches its Projects; a tag entry also matches tags
 *   nested under it (`retro` matches `retro/demand`).
 * - The Inbox always shows. Meetings are never hidden: outside the context
 *   they are dimmed (or shown as usual, `outsideMeetings: 'show'`).
 * - A Project or Area row shows when the item passes, or holds an open todo or
 *   a meeting from today on that passes; an Area also through its Projects.
 */
import {isWholeTag} from './markdown';
import {isContextTag} from './flowState';
import {normalizeSetupTag, tagMatchesSetupTag} from './noteSetups';
import {Meeting, Task} from './types';

export type ContextEntry =
  /** A Project or Area by folder name. */
  | {kind: 'item'; itemKind: 'area' | 'project'; name: string}
  /** A free tag, a loop tag or a thread tag: lowercase, no '#'. */
  | {kind: 'tag'; tag: string};

export interface ContextDef {
  id: string;
  name: string;
  /** Show. */
  shows: ContextEntry[];
  /** Except. */
  hides: ContextEntry[];
  /** Where AND What, when both parts of Show have entries; absent = either. */
  onlyInPlaces?: boolean;
  outsideMeetings: 'dim' | 'show';
  /** Given time lists loops and counterparts from this much time up; absent = Everything's (`givenTimeMinMinutes`). */
  minMinutes?: MinMinutes;
}

/** Minutes a loop or counterpart needs in a week and in a month to show in Given time. */
export interface MinMinutes {
  week: number;
  month: number;
}

export const DEFAULT_MIN_MINUTES: MinMinutes = {week: 60, month: 120};

/** The active context's threshold for `scope`, else Everything's, else the default. */
export function minMinutesOf(ctx: ContextDef | null, everything: MinMinutes | null | undefined, scope: 'week' | 'month'): number {
  return (ctx?.minMinutes ?? everything ?? DEFAULT_MIN_MINUTES)[scope];
}

/** What the matcher reads about a Project or Area (a cached item fits). */
export interface ContextItem {
  kind: 'project' | 'area';
  name: string;
  /** A Project's Area by folder name. */
  area: string | null;
}

/** A Project or Area with what can keep its row shown (a cached item fits). */
export interface ContextContentItem extends ContextItem {
  tasks: ReadonlyArray<Pick<Task, 'tags' | 'done' | 'cancelled'>>;
  meetings: ReadonlyArray<Pick<Meeting, 'tags' | 'cancelled' | 'date'>>;
}

export type MeetingContextState = 'shown' | 'dimmed';

export interface ContextMatcher {
  /** The active context; null = Everything. */
  context: ContextDef | null;
  /** A Project or Area row (Projects, Areas, Review's item steps, rosters). */
  itemShown(item: ContextItem): boolean;
  /** A todo of `item` (or the Inbox). */
  taskShown(item: ContextItem | 'inbox', task: {tags: readonly string[]}): boolean;
  /** A meeting of `item` (or the Inbox): never hidden. */
  meetingState(item: ContextItem | 'inbox', meeting: {tags: readonly string[]}): MeetingContextState;
}

export const EVERYTHING_LABEL = 'Everything';

/** The active context, or null for Everything (also when the stored id names none). */
export function activeContext(settings: {contexts?: readonly ContextDef[] | null; activeContextId?: string | null}): ContextDef | null {
  const id = settings.activeContextId;
  if (!id) return null;
  return (settings.contexts ?? []).find(c => c.id === id) ?? null;
}

const itemEntryMatches = (entry: ContextEntry, item: ContextItem): boolean =>
  entry.kind === 'item' &&
  ((entry.itemKind === item.kind && entry.name === item.name) || (entry.itemKind === 'area' && item.kind === 'project' && item.area === entry.name));

const tagEntryMatches = (entry: ContextEntry, tags: readonly string[]): boolean =>
  entry.kind === 'tag' && tags.some(tag => tagMatchesSetupTag(tag, entry.tag));

const entryMatches = (entry: ContextEntry, item: ContextItem | null, tags: readonly string[]): boolean =>
  (item !== null && itemEntryMatches(entry, item)) || tagEntryMatches(entry, tags);

/** Whether `ctx` shows an entry of `item` carrying `tags` (the item itself: no tags). */
function shown(ctx: ContextDef, item: ContextItem | null, tags: readonly string[]): boolean {
  if (ctx.hides.some(e => entryMatches(e, item, tags))) return false;
  const where = ctx.shows.filter(e => e.kind === 'item');
  const what = ctx.shows.filter(e => e.kind === 'tag');
  if (where.length === 0 && what.length === 0) return true;
  const inWhere = item !== null && where.some(e => itemEntryMatches(e, item));
  const inWhat = what.some(e => tagEntryMatches(e, tags));
  return ctx.onlyInPlaces && where.length > 0 && what.length > 0 ? inWhere && inWhat : inWhere || inWhat;
}

const rowKey = (item: ContextItem) => `${item.kind}:${item.name}`;

/** The rows `ctx` shows among `items`: the item itself, or its open todos and meetings from `today` on. */
function shownRows(ctx: ContextDef, items: readonly ContextContentItem[], today: string): Set<string> {
  const rows = new Set<string>();
  for (const item of items) {
    const content =
      item.tasks.some(t => !t.done && !t.cancelled && shown(ctx, item, t.tags)) ||
      item.meetings.some(m => !m.cancelled && m.date >= today && shown(ctx, item, m.tags));
    if (content || shown(ctx, item, [])) rows.add(rowKey(item));
    if (content && item.kind === 'project' && item.area) rows.add(`area:${item.area}`);
  }
  return rows;
}

/**
 * The matcher for `ctx` (null = Everything). Rows are worked out once from
 * `items`; an item not among them is shown by its own entries only. Todos and
 * meetings need no items.
 */
export function contextMatcher(ctx: ContextDef | null, items: readonly ContextContentItem[] = [], today = ''): ContextMatcher {
  if (!ctx) {
    return {context: null, itemShown: () => true, taskShown: () => true, meetingState: () => 'shown'};
  }
  const rows = shownRows(ctx, items, today);
  const known = new Set(items.map(rowKey));
  return {
    context: ctx,
    itemShown: item => (known.has(rowKey(item)) ? rows.has(rowKey(item)) : shown(ctx, item, [])),
    taskShown: (item, task) => item === 'inbox' || shown(ctx, item, task.tags),
    meetingState: (item, meeting) => {
      if (item === 'inbox' || shown(ctx, item, meeting.tags)) return 'shown';
      return ctx.outsideMeetings === 'show' ? 'shown' : 'dimmed';
    },
  };
}

/** What a filtered tab leaves out: the hidden line's counts. */
export interface HiddenTally {
  todos: number;
  loops: number;
  threads: number;
  items: number;
  /** Hidden todos due today or earlier: "3 due!". */
  due: number;
}

export const NO_HIDDEN: HiddenTally = {todos: 0, loops: 0, threads: 0, items: 0, due: 0};

/**
 * Counts hidden todos, the distinct loops and threads among their tags
 * (`loopKinds`/`threadTypes`: the Note setups' kinds) and the hidden todos due
 * by `today`; `items` is passed through for tabs that hide Projects or Areas.
 */
export function tallyHidden(
  hiddenTasks: ReadonlyArray<{task: Pick<Task, 'tags' | 'dueDate'>}>,
  kinds: {loopKinds: readonly string[]; threadTypes: readonly string[]},
  today: string,
  items = 0,
): HiddenTally {
  const loops = new Set<string>();
  const threads = new Set<string>();
  for (const {task} of hiddenTasks) {
    for (const tag of task.tags) {
      const [type, rest] = tag.split('/', 2);
      if (!rest) continue;
      if (kinds.loopKinds.includes(type)) loops.add(tag);
      else if (kinds.threadTypes.includes(type)) threads.add(tag);
    }
  }
  const due = hiddenTasks.filter(({task}) => task.dueDate !== null && task.dueDate <= today).length;
  return {todos: hiddenTasks.length, loops: loops.size, threads: threads.size, items, due};
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Hidden by Work: 9 todos · 2 loops · 1 thread · 3 due!", or null when nothing is hidden. `itemNoun` names hidden items ("projects", "areas", "items"). */
export function hiddenLineText(contextName: string, tally: HiddenTally, itemNoun: {one: string; many: string} = {one: 'item', many: 'items'}): string | null {
  const parts = [
    tally.todos > 0 ? plural(tally.todos, 'todo', 'todos') : '',
    tally.loops > 0 ? plural(tally.loops, 'loop', 'loops') : '',
    tally.threads > 0 ? plural(tally.threads, 'thread', 'threads') : '',
    tally.items > 0 ? plural(tally.items, itemNoun.one, itemNoun.many) : '',
    tally.due > 0 ? `${tally.due} due!` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `Hidden by ${contextName}: ${parts.join(' · ')}` : null;
}

/** "Saved to Team · hidden by Home": an entry Quick Add filed where the active context doesn't show it. */
export function hiddenAddText(ownerName: string, contextName: string): string {
  return `Saved to ${ownerName} · hidden by ${contextName}`;
}

export interface ContextKinds {
  loopKinds: readonly string[];
  threadTypes: readonly string[];
}

/** "A, B and C"; more than three: "A, B and 3 more". */
function joinList(labels: readonly string[], word: 'and' | 'or'): string {
  if (labels.length > 3) return `${labels.slice(0, 2).join(', ')} ${word} ${labels.length - 2} more`;
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} ${word} ${labels[labels.length - 1]}`;
}

function entryLabel(entry: ContextEntry, kinds: ContextKinds): string {
  if (entry.kind === 'item') return entry.name;
  if (kinds.loopKinds.includes(entry.tag)) return `all #${entry.tag} loops`;
  if (kinds.threadTypes.includes(entry.tag)) return `all #${entry.tag} threads`;
  return `#${entry.tag}`;
}

/** What `ctx` shows, as one sentence: "Show #computer in Work except #wifi"; Everything: "Show everything". */
export function contextSentence(ctx: ContextDef | null, kinds: ContextKinds): string {
  if (!ctx) return 'Show everything';
  const labels = (entries: readonly ContextEntry[]) => entries.map(e => entryLabel(e, kinds));
  const where = joinList(labels(ctx.shows.filter(e => e.kind === 'item')), 'and');
  const what = joinList(labels(ctx.shows.filter(e => e.kind === 'tag')), 'or');
  let show: string;
  if (!where && !what) show = 'Show everything';
  else if (!what) show = `Show ${where}`;
  else if (!where) show = `Show ${what} everywhere`;
  else show = ctx.onlyInPlaces ? `Show ${what} in ${where}` : `Show ${where}, plus ${what} everywhere`;
  if (ctx.hides.length === 0) return show;
  const placesOnly = ctx.hides.every(e => e.kind === 'item');
  return `${show} except ${placesOnly ? 'in ' : ''}${joinList(labels(ctx.hides), 'and')}`;
}

/** A typed tag for a context: trimmed, without '#', lowercase; null when it isn't one tag a todo could carry. */
export function normalizeContextTag(text: string): string | null {
  const tag = normalizeSetupTag(text);
  return tag && isWholeTag(tag) && isContextTag(tag) ? tag : null;
}

/** A new context's id: the next free `c<n>`. */
export function nextContextId(contexts: readonly ContextDef[]): string {
  let n = contexts.length + 1;
  while (contexts.some(c => c.id === `c${n}`)) n++;
  return `c${n}`;
}

export function newContext(contexts: readonly ContextDef[], name = ''): ContextDef {
  return {id: nextContextId(contexts), name, shows: [], hides: [], outsideMeetings: 'dim'};
}

export function sameEntry(a: ContextEntry, b: ContextEntry): boolean {
  return a.kind === 'item' ? b.kind === 'item' && a.itemKind === b.itemKind && a.name === b.name : b.kind === 'tag' && a.tag === b.tag;
}

/** `list` with `entry` added, or removed when it is in it. */
export function toggleEntry(list: readonly ContextEntry[], entry: ContextEntry): ContextEntry[] {
  return list.some(e => sameEntry(e, entry)) ? list.filter(e => !sameEntry(e, entry)) : [...list, entry];
}

/** The contexts with item entries renamed (a renamed Project or Area folder); the same array when none names it. */
export function renameItemInContexts(contexts: readonly ContextDef[], itemKind: 'area' | 'project', from: string, to: string): readonly ContextDef[] {
  const rename = (list: ContextEntry[]) => list.map(e => (e.kind === 'item' && e.itemKind === itemKind && e.name === from ? {...e, name: to} : e));
  const touches = (c: ContextDef) => [...c.shows, ...c.hides].some(e => e.kind === 'item' && e.itemKind === itemKind && e.name === from);
  if (!contexts.some(touches)) return contexts;
  return contexts.map(c => (touches(c) ? {...c, shows: rename(c.shows), hides: rename(c.hides)} : c));
}

/** Item entries that name no known Project or Area (the Integrity Check reports them). */
export function unknownContextEntries(contexts: readonly ContextDef[], items: readonly ContextItem[]): Array<{context: string; entry: ContextEntry}> {
  const out: Array<{context: string; entry: ContextEntry}> = [];
  for (const c of contexts) {
    for (const e of [...c.shows, ...c.hides]) {
      if (e.kind === 'item' && !items.some(i => i.kind === e.itemKind && i.name === e.name)) out.push({context: c.name, entry: e});
    }
  }
  return out;
}

/** Open `#next` todos of the Active Projects and Areas `ctx` shows (Everything: all of them): the count next to each context. */
export function nextCountOf(
  ctx: ContextDef | null,
  items: ReadonlyArray<ContextItem & {status: string; loadError?: string; tasks: ReadonlyArray<Pick<Task, 'tags' | 'done' | 'cancelled' | 'flowState'>>}>,
): number {
  const matcher = contextMatcher(ctx);
  let n = 0;
  for (const item of items) {
    if (item.loadError || item.status !== 'active') continue;
    for (const task of item.tasks) if (!task.done && !task.cancelled && task.flowState === 'next' && matcher.taskShown(item, task)) n++;
  }
  return n;
}
