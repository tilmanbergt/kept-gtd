/**
 * The known-tag index of the writing help (docs/dev/history/technical-design-writing-help.md
 * §1.2, §3.1): every tag the user already chose, with the order suggestions
 * are ranked in. Pure: the caller collects the sources (storage/knownTagIndex.ts)
 * and keeps one index per cache and settings state.
 *
 * Building walks every tag once. `has` is a set lookup, Rule A a map lookup
 * by skeleton; Rules B and P walk the top-level tags only when A misses.
 * Nested tags are checked per part: the first segment against the top-level
 * tags, the second against the subtags known under that parent.
 */
import {ONE_STEP_MIN_LENGTH, oneStepOff, pluralMatch, tagSkeleton} from './tagSkeleton';

/** Where the index's tags come from, each lowercased without `#`. */
export interface KnownTagSources {
  /** Tags of the Note setups (Thread and Loop). */
  setupTags: readonly string[];
  /** Abbreviations of Active and On Hold Projects and Areas, with the item's name. */
  abbrevs: ReadonlyArray<{tag: string; name: string}>;
  /** Counterpart threads, `type/leaf`. */
  counterparts: readonly string[];
  /** Tags the contexts show or hide. */
  contextTags: readonly string[];
  /** Kept's own words: `next`, `someday`, `monthly`, … */
  reservedTags: readonly string[];
  /** Recently used tags, most recent first (storage/tagUsage.ts). */
  recentTags: readonly string[];
  /** Every tag of every todo and meeting, with the entry's date ('' for none). */
  usedTags: ReadonlyArray<{tag: string; date: string}>;
  /** The types whose second segment is a counterpart (the Thread setups' types). */
  threadTypes?: readonly string[];
}

/** Ranking order (§1.2): Note setup tags, abbreviations, counterparts, recent tags, the rest. */
export const RANK = {setup: 0, abbrev: 1, counterpart: 2, recent: 3, other: 4} as const;

export interface KnownTag {
  tag: string;
  /** The Project/Area an abbreviation files to, shown grey next to it. */
  name?: string;
}

interface Entry {
  tag: string;
  skeleton: string;
  rank: number;
  /** Position in the recent tags (lower = more recent), or Infinity. */
  recent: number;
  /** Latest date the tag was used on ('' never). */
  lastDate: string;
  name?: string;
}

export interface KnownTagIndex {
  /** Number of distinct full tags. */
  readonly size: number;
  /** Whether `tag` (any case) is known: as a tag, or as the first segment of a nested one. */
  has(tag: string): boolean;
  /** Whether `child` is a known subtag of `parent`. */
  hasChild(parent: string, child: string): boolean;
  /** Rule A: known top-level tags with the same skeleton as `tag`, best first, `tag` itself left out. */
  lookup(tag: string): string[];
  /** The one best top-level suggestion for an unknown `tag`: Rule A, else Rules P and B. */
  bestTop(tag: string): string | null;
  /** The same for an unknown subtag of `parent`, among that parent's known subtags. */
  bestChild(parent: string, child: string): string | null;
  /** Up to `limit` known tags that start with `prefix` (lowercase or skeleton), best first, `prefix` itself left out. */
  complete(prefix: string, limit: number): KnownTag[];
  /** The known subtags of `parent`, most recent first. */
  childrenOf(parent: string): string[];
  /** Whether `tag` (any case) is a Project/Area abbreviation - always written upper case. */
  isAbbrev(tag: string): boolean;
  /** Whether `type`'s second segment is a counterpart (`101` in `#101/mieke`). */
  isThreadType(type: string): boolean;
}

function better(a: Entry, b: Entry): number {
  return a.rank - b.rank || a.recent - b.recent || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0);
}

function byRecency(a: Entry, b: Entry): number {
  if (a.recent !== b.recent) return a.recent - b.recent;
  if (a.lastDate !== b.lastDate) return a.lastDate > b.lastDate ? -1 : 1;
  return a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0;
}

/** Whether `written` is close enough to the known `known` for Rules P or B. */
function nearby(written: string, writtenSkeleton: string, known: Entry): boolean {
  // Most tags differ in length by more than any rule allows: one comparison each.
  const diff = written.length - known.tag.length;
  if (diff > 2 || diff < -2) return false;
  if (diff !== 0 && written[0] === known.tag[0] && pluralMatch(written, known.tag)) return true;
  // One edit of a word of four or more keeps its first or its last character.
  const k = known.skeleton;
  if (writtenSkeleton[0] !== k[0] && writtenSkeleton[writtenSkeleton.length - 1] !== k[k.length - 1]) return false;
  return written.length >= ONE_STEP_MIN_LENGTH && known.tag.length >= ONE_STEP_MIN_LENGTH && oneStepOff(writtenSkeleton, known.skeleton);
}

function bestOf(written: string, all: readonly Entry[], bySkeleton: Map<string, Entry[]> | null): string | null {
  const lower = written.toLowerCase();
  const skeleton = tagSkeleton(lower);
  let best: Entry | null = null;
  const pool = bySkeleton ? bySkeleton.get(skeleton) ?? [] : all.filter(e => e.skeleton === skeleton);
  for (const e of pool) if (e.tag !== lower && (!best || better(e, best) < 0)) best = e;
  if (best) return best.tag;
  for (const e of all) {
    if (e.tag !== lower && nearby(lower, skeleton, e) && (!best || better(e, best) < 0)) best = e;
  }
  return best ? best.tag : null;
}

/** Builds the index - see the module doc comment. */
export function buildKnownTagIndex(sources: KnownTagSources): KnownTagIndex {
  const recentPos = new Map<string, number>();
  sources.recentTags.forEach((t, i) => {
    if (!recentPos.has(t)) recentPos.set(t, i);
  });
  const full = new Map<string, Entry>();
  const add = (raw: string, rank: number, date = '', name?: string) => {
    const tag = raw.replace(/^#/, '').toLowerCase().trim();
    if (!tag) return;
    const known = full.get(tag);
    if (known) {
      if (rank < known.rank) known.rank = rank;
      if (date > known.lastDate) known.lastDate = date;
      if (name && !known.name) known.name = name;
      return;
    }
    full.set(tag, {tag, skeleton: tagSkeleton(tag), rank, recent: recentPos.get(tag) ?? Infinity, lastDate: date, name});
  };
  for (const t of sources.setupTags) add(t, RANK.setup);
  for (const a of sources.abbrevs) add(a.tag, RANK.abbrev, '', a.name);
  for (const t of sources.counterparts) add(t, RANK.counterpart);
  for (const t of sources.recentTags) add(t, RANK.recent);
  for (const t of sources.contextTags) add(t, RANK.other);
  for (const t of sources.reservedTags) add(t, RANK.other);
  for (const u of sources.usedTags) add(u.tag, RANK.other, u.date);

  // Top-level names: plain tags and the first segment of nested ones; a
  // counterpart's leaf is a plain tag too (`#lena` belongs to `101/lena`).
  const top = new Map<string, Entry>();
  const children = new Map<string, Map<string, Entry>>();
  const addTop = (tag: string, from: Entry) => {
    const known = top.get(tag);
    if (!known) top.set(tag, {...from, tag, skeleton: tag === from.tag ? from.skeleton : tagSkeleton(tag)});
    else if (better(from, known) < 0) top.set(tag, {...from, tag, skeleton: known.skeleton, name: known.name ?? from.name});
  };
  for (const e of full.values()) {
    const parts = e.tag.split('/');
    addTop(parts[0], parts.length === 1 ? e : {...e, name: undefined});
    if (parts.length < 2 || !parts[1]) continue;
    let kids = children.get(parts[0]);
    if (!kids) children.set(parts[0], (kids = new Map()));
    const child = kids.get(parts[1]);
    if (!child || byRecency(e, child) < 0) kids.set(parts[1], {...e, tag: parts[1], skeleton: tagSkeleton(parts[1])});
    if (e.rank === RANK.counterpart) addTop(parts[1], e);
  }
  const topBySkeleton = new Map<string, Entry[]>();
  for (const e of top.values()) {
    const list = topBySkeleton.get(e.skeleton);
    if (list) list.push(e);
    else topBySkeleton.set(e.skeleton, [e]);
  }
  const topList = Array.from(top.values());
  const abbrevSet = new Set(sources.abbrevs.map(a => a.tag.toLowerCase()));
  const threadTypes = new Set((sources.threadTypes ?? []).map(t => t.toLowerCase()));
  const ordered = Array.from(full.values()).sort(better);

  return {
    size: full.size,
    has: tag => {
      const lower = tag.toLowerCase();
      return full.has(lower) || top.has(lower);
    },
    hasChild: (parent, child) => children.get(parent.toLowerCase())?.has(child.toLowerCase()) ?? false,
    lookup: tag => {
      const lower = tag.toLowerCase();
      return (topBySkeleton.get(tagSkeleton(lower)) ?? [])
        .filter(e => e.tag !== lower)
        .sort(better)
        .map(e => e.tag);
    },
    bestTop: tag => bestOf(tag, topList, topBySkeleton),
    bestChild: (parent, child) => {
      const kids = children.get(parent.toLowerCase());
      return kids ? bestOf(child, Array.from(kids.values()), null) : null;
    },
    complete: (prefix, limit) => {
      const lower = prefix.toLowerCase();
      const skeleton = tagSkeleton(lower);
      const out: KnownTag[] = [];
      for (const e of ordered) {
        if (out.length >= limit) break;
        if (e.tag === lower) continue;
        if (e.tag.startsWith(lower) || e.skeleton.startsWith(skeleton)) out.push(e.name ? {tag: e.tag, name: e.name} : {tag: e.tag});
      }
      return out;
    },
    childrenOf: parent => {
      const kids = children.get(parent.toLowerCase());
      return kids ? Array.from(kids.values()).sort(byRecency).map(e => e.tag) : [];
    },
    isAbbrev: tag => abbrevSet.has(tag.toLowerCase()),
    isThreadType: type => threadTypes.has(type.toLowerCase()),
  };
}
