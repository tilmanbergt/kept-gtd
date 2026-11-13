/**
 * Which Projects and Areas use a tag (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): tag (lowercase) → owner path → how many of its open todos and
 * not-cancelled meetings carry it, for the Inbox card's File to suggestions
 * (domain/inboxFileTo.ts). Built from the cache, remembered for the items
 * array it was built from - a new cache version builds it again.
 */
import {isTopicTag} from '../domain/inboxFileTo';
import {CachedItem} from './dataCache';

let built: {items: readonly CachedItem[]; owners: Map<string, Map<string, number>>} | null = null;

export function tagOwners(items: readonly CachedItem[]): ReadonlyMap<string, ReadonlyMap<string, number>> {
  if (built && built.items === items) return built.owners;
  const owners = new Map<string, Map<string, number>>();
  const count = (tag: string, path: string) => {
    const t = tag.toLowerCase();
    if (!isTopicTag(t)) return;
    const byOwner = owners.get(t) ?? new Map<string, number>();
    byOwner.set(path, (byOwner.get(path) ?? 0) + 1);
    owners.set(t, byOwner);
  };
  for (const item of items) {
    for (const task of item.tasks) if (!task.done && !task.cancelled) task.tags.forEach(tag => count(tag, item.path));
    for (const meeting of item.meetings) if (!meeting.cancelled) meeting.tags.forEach(tag => count(tag, item.path));
  }
  built = {items, owners};
  return owners;
}
