/**
 * The writing help's known-tag index for the current data
 * (docs/dev/history/technical-design-writing-help.md §1.2, §3.1): collected
 * from the cache (every todo and meeting, the Inbox's included, the
 * abbreviations and the confirmed counterparts) and the settings (Note setups,
 * contexts), plus the recent tags and Kept's own words.
 *
 * `scopeTags` gives the active loops and counterparts of one place, for the
 * order of completions.
 *
 * Built only when a check needs it, and kept for as long as the cache, the
 * Inbox, the settings object and the recent tags stay the same - the cache is
 * changed in place, so its version stands for it.
 */
import {RESERVED_BARE_TAGS, WAITING_FOR_TYPE} from '../domain/flowState';
import {GtdParaSettings} from '../domain/settings';
import {OWE_TYPE, threadOf} from '../domain/threads';
import {buildKnownTagIndex, KnownTagIndex, KnownTagSources} from '../domain/writing/knownTags';
import {activeContext, contextMatcher} from '../domain/contexts';
import {scopeMembers, scopeOwnerOf, threadTypesOf} from '../domain/counterparts';
import {CompletionScope} from '../domain/writing/completion';
import {CachedItem, getCachedData, getCachedInbox, getCacheVersion, getInboxVersion} from './dataCache';
import {peekSettings} from './settingsSnapshot';

/** The index's sources from `settings` and the cache as it is now. */
export function knownTagSources(settings: GtdParaSettings | null, recentTags: readonly string[]): KnownTagSources {
  const setups = settings?.noteSetups ?? [];
  const setupTags = setups.filter(s => s.enabled).flatMap(s => s.tags);
  const types = new Set(threadTypesOf(setups).filter(t => t !== WAITING_FOR_TYPE && t !== OWE_TYPE));
  const items = getCachedData()?.items ?? [];
  const inbox = getCachedInbox();
  const usedTags: Array<{tag: string; date: string}> = [];
  const counterparts: string[] = [];
  const lists = [...items, ...(inbox ? [inbox] : [])];
  for (const list of lists) {
    for (const task of list.tasks) for (const tag of task.tags) usedTags.push({tag, date: task.dueDate ?? ''});
    for (const meeting of list.meetings) {
      for (const tag of meeting.tags) {
        usedTags.push({tag, date: meeting.date});
        const thread = threadOf(tag);
        if (thread && types.has(thread.type)) counterparts.push(thread.tag);
      }
    }
  }
  for (const item of items) for (const line of item.threads) counterparts.push(line.leaf);
  const abbrevs = items
    .filter(i => i.abbrev && (i.status === 'active' || i.status === 'on-hold'))
    .map(i => ({tag: i.abbrev!, name: i.name}));
  const contextTags = (settings?.contexts ?? []).flatMap(c => [...c.shows, ...c.hides]).flatMap(e => (e.kind === 'tag' ? [e.tag] : []));
  return {
    setupTags,
    abbrevs,
    counterparts,
    contextTags,
    reservedTags: [...RESERVED_BARE_TAGS, WAITING_FOR_TYPE, OWE_TYPE],
    recentTags,
    usedTags,
    threadTypes: Array.from(types),
  };
}

/**
 * The active loops and counterparts of where an item goes (§10.4): for a
 * Project or Area, its scope - the Area and its Projects, as the thread
 * overview counts them; for `null` (Daily, Week, Month, the Inbox), every
 * Active or On Hold Project and Area the active context shows.
 */
export function scopeTags(itemPath: string | null): CompletionScope {
  const settings = peekSettings();
  const version = getCacheVersion();
  if (scopeMemo && scopeMemo.version === version && scopeMemo.settings === settings && scopeMemo.path === itemPath) return scopeMemo.scope;
  const items = (getCachedData()?.items ?? []).filter(i => !i.loadError && (i.status === 'active' || i.status === 'on-hold'));
  let members: CachedItem[];
  if (itemPath) {
    const owner = scopeOwnerOf(itemPath, items);
    members = owner ? scopeMembers(owner, items) : [];
  } else {
    const ctx = settings ? activeContext(settings) : null;
    const matcher = contextMatcher(ctx, items);
    members = items.filter(i => matcher.itemShown(i));
  }
  const unique = (list: string[]) => Array.from(new Set(list));
  const scope = {
    loops: unique(members.flatMap(i => i.loops.filter(l => l.status === 'active').map(l => l.tag))),
    counterparts: unique(members.flatMap(i => i.threads.filter(t => t.status === 'active').map(t => t.leaf))),
  };
  scopeMemo = {version, settings, path: itemPath, scope};
  return scope;
}

let scopeMemo: {version: number; settings: GtdParaSettings | null; path: string | null; scope: CompletionScope} | null = null;

let memo: {cache: number; inbox: number; settings: GtdParaSettings | null; recent: readonly string[]; index: KnownTagIndex} | null = null;

/** The index for the current cache and settings, built at most once per state of them. */
export function currentKnownTagIndex(recentTags: readonly string[]): KnownTagIndex {
  const settings = peekSettings();
  const cache = getCacheVersion();
  const inbox = getInboxVersion();
  if (memo && memo.cache === cache && memo.inbox === inbox && memo.settings === settings && memo.recent === recentTags) return memo.index;
  const index = buildKnownTagIndex(knownTagSources(settings, recentTags));
  memo = {cache, inbox, settings, recent: recentTags, index};
  return index;
}
