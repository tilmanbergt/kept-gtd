/**
 * Tags that look like a typo (docs/dev/history/technical-design-writing-help.md
 * §1.8, §3.9): used exactly once, and one step (Rules A, B, P) from a tag
 * that is known for other reasons - used more than once, a Note setup tag,
 * an abbreviation, a counterpart, a context tag, one of Kept's own words.
 * The list of the Integrity Check report and of Settings → Input. Pure; it
 * only reports.
 */
import {buildKnownTagIndex, KnownTagIndex, KnownTagSources} from './knownTags';
import {isUncheckedTag, suggestionFor} from './tagCheck';

export interface TagTypo {
  /** The tag as used, lowercase, without `#`. */
  tag: string;
  /** The known tag it is probably meant to be. */
  suggestion: string;
}

/** How often each tag is used (lowercase, without `#`). */
export type TagUsage = ReadonlyMap<string, number>;

/**
 * The index the typo list compares against: `base` plus the tags used more
 * than once. Recent tags are left out - a typo saved lately is one of them.
 */
export function typoIndex(usage: TagUsage, base: Omit<KnownTagSources, 'usedTags' | 'recentTags'>): KnownTagIndex {
  const usedTags = Array.from(usage).flatMap(([tag, count]) => (count > 1 ? [{tag, date: ''}] : []));
  return buildKnownTagIndex({...base, recentTags: [], usedTags});
}

/** The tags used once that the rules flag, with their suggestion, alphabetically; `kept` (lowercase) are left out. */
export function tagTypos(usage: TagUsage, index: KnownTagIndex, kept: ReadonlySet<string> = new Set()): TagTypo[] {
  const typos: TagTypo[] = [];
  for (const [tag, count] of usage) {
    if (count !== 1 || isUncheckedTag(tag) || kept.has(tag) || index.has(tag)) continue;
    const suggestion = suggestionFor(tag, index);
    if (suggestion) typos.push({tag, suggestion: suggestion.toLowerCase()});
  }
  return typos.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
}

/** Counts `tags` lists into one usage map. */
export function countTags(lists: Iterable<readonly string[]>): Map<string, number> {
  const usage = new Map<string, number>();
  for (const tags of lists) {for (const raw of tags) {
    const tag = raw.toLowerCase();
    usage.set(tag, (usage.get(tag) ?? 0) + 1);
  }}
  return usage;
}
