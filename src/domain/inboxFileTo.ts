/**
 * The places an Inbox item's card suggests to file it to
 * (docs/dev/history/technical-design-calmer-screens.md §3.7): ranked, never
 * applied - the user taps one or More…. Pure.
 *
 * 1. a Project's or Area's abbreviation written as a tag in the item (`#GR`);
 * 2. the owners whose open todos and meetings carry one of the item's tags,
 *    most uses first (`tagOwners`, storage/tagOwners.ts);
 * 3. the places filed to lately (storage/destinationUsage.ts), most recent first.
 * At most four, Active ones only, never the Inbox.
 */
import {FileToItem} from './captureFileTo';

/** How many suggestions the card shows. */
export const INBOX_FILE_TO_LIMIT = 4;

/** Tags that say how a todo or meeting stands, not what it is about: they suggest no place. */
const STATE_TAGS = new Set(['next', 'now', 'someday', 'maybe', 'wf', 'prepped', 'reviewed', 'focusblock', 'monthly']);

/** Whether a tag (lowercase, without `#`) can point to a place. */
export function isTopicTag(tag: string): boolean {
  const t = tag.toLowerCase();
  return !STATE_TAGS.has(t) && !t.startsWith('wf/') && !t.startsWith('owe/');
}

export interface InboxFileToInput<T extends FileToItem> {
  /** The item's tags, as parsed (without `#`). */
  tags: readonly string[];
  /** Every Project and Area. */
  places: readonly T[];
  /** tag (lowercase) → owner path → how many open todos and meetings carry it. */
  tagOwners: ReadonlyMap<string, ReadonlyMap<string, number>>;
  /** Paths filed to lately, most recent first. */
  recent: readonly string[];
  limit?: number;
}

export function inboxFileTo<T extends FileToItem>(input: InboxFileToInput<T>): T[] {
  const limit = input.limit ?? INBOX_FILE_TO_LIMIT;
  const active = input.places.filter(p => p.status === 'active');
  const byPath = new Map(active.map(p => [p.path, p]));
  const out: T[] = [];
  const add = (place: T | undefined) => {
    if (place && !out.includes(place) && out.length < limit) out.push(place);
  };
  const tags = input.tags.map(t => t.toLowerCase());
  for (const place of active) if (place.abbrev && tags.includes(place.abbrev.toLowerCase())) add(place);
  const uses = new Map<string, number>();
  for (const tag of tags) {
    if (!isTopicTag(tag)) continue;
    for (const [path, count] of input.tagOwners.get(tag) ?? []) uses.set(path, (uses.get(path) ?? 0) + count);
  }
  [...uses.entries()]
    .filter(([path]) => byPath.has(path))
    .sort((a, b) => b[1] - a[1] || byPath.get(a[0])!.name.localeCompare(byPath.get(b[0])!.name))
    .forEach(([path]) => add(byPath.get(path)));
  for (const path of input.recent) add(byPath.get(path));
  return out;
}
