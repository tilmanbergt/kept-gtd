/**
 * The Suggest view of Quick Add's text strip
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.2, D1): what is
 * offered while nothing else is going on, in this order, until the strip is
 * full - This file (Kept opened from a file, nothing linked yet), the
 * starters on an empty field (counted by the caller), `#next` and
 * `#someday` (todos only, unless written already), recent tags not in the
 * text, the abbreviations of recently used places. Offered, never applied.
 * Pure; widths are estimates in dp, as domain/writing/tagChipLayout-style
 * chip widths are elsewhere.
 */
import {tagSpans} from '../markdown';
import {SuggestOption} from './stripContent';

export interface SuggestInput {
  text: string;
  kind: 'task' | 'meeting' | 'agreement' | 'note';
  /** This file can be offered (opened from a file, the item links nothing yet). */
  thisFile: boolean;
  /** Most recent first, without `#`. */
  recentTags: readonly string[];
  /** Abbreviations of the places used lately, most recent first, without `#` (the name is not shown). */
  abbrevs: ReadonlyArray<{tag: string; name: string}>;
  /** Width the starters (Thread · Loop · Paste) already take, in dp. */
  reservedDp?: number;
}

/** About 9 dp per character at the strip's small font, plus the button's padding, border and gap. */
const CHAR_DP = 9;
const BUTTON_DP = 20;
/** The drawn clip before "This file". */
const ICON_DP = 20;
/** The view switch square and ✕ at the strip's end. */
const END_DP = 80;

/** A button's estimated width for `label`. */
export function suggestButtonDp(label: string): number {
  return label.length * CHAR_DP + BUTTON_DP;
}

export function suggestLabel(option: SuggestOption): string {
  return option.kind === 'thisFile' ? 'This file' : `#${option.tag}`;
}

/** The options for `input`, as many as fit `maxWidthDp`, no tag twice and none already in the text. */
export function suggestOptions(input: SuggestInput, maxWidthDp: number): SuggestOption[] {
  const inText = new Set(tagSpans(input.text).map(t => t.tag.toLowerCase()));
  const seen = new Set<string>();
  const candidates: SuggestOption[] = [];
  if (input.thisFile) candidates.push({kind: 'thisFile'});
  // A place's abbreviation is offered and written in upper case, without the place's name (§11 G7).
  const abbrevs = new Set(input.abbrevs.map(a => a.tag.replace(/^#/, '').toLowerCase()));
  const tag = (t: string) => {
    const lower = t.replace(/^#/, '').toLowerCase();
    if (!lower || inText.has(lower) || seen.has(lower)) return;
    seen.add(lower);
    candidates.push({kind: 'tag', tag: abbrevs.has(lower) ? lower.toUpperCase() : t.replace(/^#/, '')});
  };
  if (input.kind === 'task') {
    tag('next');
    tag('someday');
  }
  for (const t of input.recentTags) tag(t);
  for (const a of input.abbrevs) tag(a.tag);
  let room = maxWidthDp - END_DP - (input.reservedDp ?? 0);
  const out: SuggestOption[] = [];
  for (const option of candidates) {
    const width = suggestButtonDp(suggestLabel(option)) + (option.kind === 'thisFile' ? ICON_DP : 0);
    if (width > room) break;
    room -= width;
    out.push(option);
  }
  return out;
}
