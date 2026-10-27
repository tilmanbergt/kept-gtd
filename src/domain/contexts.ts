/**
 * Contexts (docs/dev/history/technical-design-time-and-place.md §3.3,
 * requirements D20-D25, §12 Q1-Q2): a named place - Work, Home, Café - that
 * decides what Daily, Week, Month, Projects, Areas and Review show. Stored
 * per profile in `settings.contexts`; the active one is
 * `settings.activeContextId` ('' = Everything, built in). Pure.
 *
 * The rules, in this order:
 * 1. Everything shows all.
 * 2. Inbox entries and todos due today or overdue always show.
 * 3. An item entry matches a Project or Area by kind and folder name; an
 *    Area also matches its Projects (`area:`). A tag entry matches a todo or
 *    meeting carrying the tag or one nested under it (`tagMatchesSetupTag`:
 *    `retro` matches `retro/demand`), so loops and threads are tag entries.
 * 4. Hides wins. Then a non-empty Shows list shows only what it matches; an
 *    empty one shows everything else ("everything but work").
 * 5. Meetings are never hidden: matched ones show, the others are dimmed (or
 *    shown as usual, `outsideMeetings: 'show'`).
 */
import {tagMatchesSetupTag} from './noteSetups';
import {Meeting, Task} from './types';

export type ContextEntry =
  /** A Project or Area by folder name. */
  | {kind: 'item'; itemKind: 'area' | 'project'; name: string}
  /** A free tag, a loop tag or a thread tag: lowercase, no '#'. */
  | {kind: 'tag'; tag: string};

export interface ContextDef {
  id: string;
  name: string;
  shows: ContextEntry[];
  hides: ContextEntry[];
  outsideMeetings: 'dim' | 'show';
}

/** What the matcher reads about a Project or Area (a cached item fits). */
export interface ContextItem {
  kind: 'project' | 'area';
  name: string;
  /** A Project's Area by folder name. */
  area: string | null;
}

export type MeetingContextState = 'shown' | 'dimmed';

export interface ContextMatcher {
  /** The active context; null = Everything. */
  context: ContextDef | null;
  /** A Project or Area row (Projects, Areas, Review's item steps). */
  itemShown(item: ContextItem): boolean;
  /** An open todo of `item` (or the Inbox). */
  taskShown(item: ContextItem | 'inbox', task: Pick<Task, 'tags' | 'dueDate'>, today: string): boolean;
  /** A meeting of `item` (or the Inbox): never hidden (rule 5). */
  meetingState(item: ContextItem | 'inbox', meeting: Pick<Meeting, 'tags'>): MeetingContextState;
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

function matchesAny(entries: readonly ContextEntry[], item: ContextItem | null, tags: readonly string[]): boolean {
  return entries.some(entry => (item !== null && itemEntryMatches(entry, item)) || tagEntryMatches(entry, tags));
}

/** Rules 3-4 for one entry of `item` with `tags`. */
function passes(ctx: ContextDef, item: ContextItem | null, tags: readonly string[]): boolean {
  if (matchesAny(ctx.hides, item, tags)) return false;
  return ctx.shows.length === 0 || matchesAny(ctx.shows, item, tags);
}

export function contextMatcher(ctx: ContextDef | null): ContextMatcher {
  if (!ctx) {
    return {context: null, itemShown: () => true, taskShown: () => true, meetingState: () => 'shown'};
  }
  return {
    context: ctx,
    itemShown: item => passes(ctx, item, []),
    taskShown: (item, task, today) => {
      if (item === 'inbox') return true;
      if (task.dueDate && task.dueDate <= today) return true;
      return passes(ctx, item, task.tags);
    },
    meetingState: (item, meeting) => {
      if (item === 'inbox' || passes(ctx, item, meeting.tags)) return 'shown';
      return ctx.outsideMeetings === 'show' ? 'shown' : 'dimmed';
    },
  };
}

/** What a filtered tab leaves out (D24): the hidden line's counts. */
export interface HiddenTally {
  todos: number;
  loops: number;
  threads: number;
  items: number;
}

export const NO_HIDDEN: HiddenTally = {todos: 0, loops: 0, threads: 0, items: 0};

/**
 * Counts hidden todos, and the distinct loops and threads among their tags
 * (`loopKinds`/`threadTypes`: the Note setups' kinds); `items` is passed
 * through for tabs that hide Projects or Areas.
 */
export function tallyHidden(
  hiddenTasks: ReadonlyArray<{task: Pick<Task, 'tags'>}>,
  kinds: {loopKinds: readonly string[]; threadTypes: readonly string[]},
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
  return {todos: hiddenTasks.length, loops: loops.size, threads: threads.size, items};
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Hidden by Work: 9 todos · 2 loops · 1 thread", or null when nothing is hidden. `itemNoun` names hidden items ("projects", "areas", "items"). */
export function hiddenLineText(contextName: string, tally: HiddenTally, itemNoun: {one: string; many: string} = {one: 'item', many: 'items'}): string | null {
  const parts = [
    tally.todos > 0 ? plural(tally.todos, 'todo', 'todos') : '',
    tally.loops > 0 ? plural(tally.loops, 'loop', 'loops') : '',
    tally.threads > 0 ? plural(tally.threads, 'thread', 'threads') : '',
    tally.items > 0 ? plural(tally.items, itemNoun.one, itemNoun.many) : '',
  ].filter(Boolean);
  return parts.length > 0 ? `Hidden by ${contextName}: ${parts.join(' · ')}` : null;
}

/** "Saved to Atruvia · hidden by Home" (§3.3): an entry Quick Add filed where the active context doesn't show it. */
export function hiddenAddText(ownerName: string, contextName: string): string {
  return `Saved to ${ownerName} · hidden by ${contextName}`;
}

/** The chip menu's one-line summary: "Shows Atruvia, #reading · hides #computer"; "Shows everything". */
export function contextSummary(ctx: ContextDef): string {
  const label = (e: ContextEntry) => (e.kind === 'item' ? e.name : `#${e.tag}`);
  const shows = ctx.shows.length > 0 ? `Shows ${ctx.shows.map(label).join(', ')}` : 'Shows everything';
  return ctx.hides.length > 0 ? `${shows} · hides ${ctx.hides.map(label).join(', ')}` : shows;
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
