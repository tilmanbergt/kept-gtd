/**
 * The writing help's known-tag index for the current data
 * (docs/dev/history/technical-design-writing-help.md §1.2, §3.1): collected
 * from the cache (every todo and meeting, the Inbox's included, the
 * abbreviations and the confirmed counterparts) and the settings (Note setups,
 * contexts), plus the recent tags and Kept's own words.
 *
 * Built only when a check needs it, and kept for as long as the cache, the
 * Inbox, the settings object and the recent tags stay the same - the cache is
 * changed in place, so its version stands for it.
 */
import {threadTypesOf} from '../domain/counterparts';
import {RESERVED_BARE_TAGS, WAITING_FOR_TYPE} from '../domain/flowState';
import {GtdParaSettings} from '../domain/settings';
import {OWE_TYPE, threadOf} from '../domain/threads';
import {buildKnownTagIndex, KnownTagIndex, KnownTagSources} from '../domain/writing/knownTags';
import {getCachedData, getCachedInbox, getCacheVersion, getInboxVersion} from './dataCache';
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
  };
}

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
