/**
 * The writing help's memory (docs/dev/history/technical-design-writing-help.md
 * §1.5, §3.2, §3.9): tag corrections the user taught by tapping `→ #x` in
 * Quick Add, and tags kept as written in Settings → Input. Plugin-internal UI
 * state like the recent tags (storage/tagUsage.ts) - never content, never in a
 * profile file - under one profile-scoped AsyncStorage key.
 *
 * A synchronous copy is kept in memory once read, so the field's change
 * handler can look a burst's tags up without waiting.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TAG_FIXES_KEY} from '../domain/storeKeys';
import {log, logWarn} from '../utils/log';
import {errorMessage} from '../utils/errorMessage';
import {onActiveProfileChange, profileScopedKey} from './profileKeys';

/** One learned correction, both sides lowercased without `#` except `to`, kept as tapped. */
export interface LearnedFix {
  from: string;
  to: string;
}

interface Stored {
  /** Most recent first. */
  fixes: LearnedFix[];
  /** Tags the user kept as written in Settings → Input's typo list (lowercase). */
  kept: string[];
}

export const MAX_LEARNED_FIXES = 200;
const MAX_KEPT = 200;

const EMPTY: Stored = {fixes: [], kept: []};
let memory: Stored | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): Stored {
  if (!raw) return EMPTY;
  const parsed = JSON.parse(raw);
  const fixes = Array.isArray(parsed?.fixes)
    ? parsed.fixes.filter((f: unknown): f is LearnedFix => typeof (f as LearnedFix)?.from === 'string' && typeof (f as LearnedFix)?.to === 'string')
    : [];
  const kept = Array.isArray(parsed?.kept) ? parsed.kept.filter((t: unknown): t is string => typeof t === 'string') : [];
  return {fixes, kept};
}

/** Bumped by every save: a read that started before a save must not overwrite it. */
let generation = 0;

/**
 * Reads the store into memory - once per profile, or again with `fresh` (a
 * Quick Add field mounting: Remove Kept's data may have emptied the store
 * meanwhile). An unreadable store starts empty.
 */
export async function loadLearnedFixes(fresh = false): Promise<void> {
  if (memory && !fresh) return;
  const started = generation;
  let read: Stored;
  try {
    read = parse(await AsyncStorage.getItem(profileScopedKey(TAG_FIXES_KEY)));
  } catch (e) {
    logWarn('learnedTagFixes: unreadable, starting empty', errorMessage(e));
    read = EMPTY;
  }
  if (generation !== started) return;
  memory = read;
  listeners.forEach(l => l());
}

async function save(next: Stored): Promise<void> {
  generation += 1;
  memory = next;
  listeners.forEach(l => l());
  try {
    await AsyncStorage.setItem(profileScopedKey(TAG_FIXES_KEY), JSON.stringify(next));
  } catch (e) {
    logWarn('learnedTagFixes: save failed', errorMessage(e));
  }
}

/** The learned corrections as a map `from -> to`, or an empty map before the first read. */
export function getLearnedFixesSync(): ReadonlyMap<string, string> {
  return new Map((memory ?? EMPTY).fixes.map(f => [f.from, f.to]));
}

/** The learned corrections, most recent first. */
export function learnedFixList(): readonly LearnedFix[] {
  return (memory ?? EMPTY).fixes;
}

/** The tags kept as written in Settings → Input (lowercase). */
export function keptTypoTags(): ReadonlySet<string> {
  return new Set((memory ?? EMPTY).kept);
}

/** Learns `from -> to` (most recent first, capped). Counts only in the log - tags are names. */
export async function learnFix(from: string, to: string): Promise<void> {
  await loadLearnedFixes();
  const key = from.toLowerCase();
  const current = memory ?? EMPTY;
  const fixes = [{from: key, to}, ...current.fixes.filter(f => f.from !== key)].slice(0, MAX_LEARNED_FIXES);
  log('writing: learned fix', {count: fixes.length});
  await save({...current, fixes});
}

/** Forgets the correction for `from` (Undo in the strip, ✕ in Settings → Input). */
export async function forgetFix(from: string): Promise<void> {
  await loadLearnedFixes();
  const key = from.toLowerCase();
  const current = memory ?? EMPTY;
  if (!current.fixes.some(f => f.from === key)) return;
  await save({...current, fixes: current.fixes.filter(f => f.from !== key)});
}

/** Keeps `tag` as written: it leaves the typo list of this profile. */
export async function keepTypoTag(tag: string): Promise<void> {
  await loadLearnedFixes();
  const key = tag.toLowerCase();
  const current = memory ?? EMPTY;
  if (current.kept.includes(key)) return;
  await save({...current, kept: [key, ...current.kept].slice(0, MAX_KEPT)});
}

/** Called after every change (load, learn, forget, keep, profile switch). */
export function subscribeLearnedFixes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Per profile, like the recent tags (docs/dev/history/technical-design-profiles-demo-space.md §3.3).
onActiveProfileChange(() => {
  memory = null;
  listeners.forEach(l => l());
});
