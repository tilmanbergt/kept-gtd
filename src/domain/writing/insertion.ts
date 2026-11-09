/**
 * What one change of a text field inserted (docs/dev/history/technical-design-writing-help.md
 * §1.1 point 1). Handwriting recognition writes a whole word or sentence at
 * once after the pen pauses; a change that inserts more than one character
 * is a *burst* (recognition or Paste), and only its text is checked. A typed
 * character is checked only when it ends a tag. Pure.
 */
import {tagSpans} from '../markdown';
import {TextSpan} from './tagCheck';

/**
 * The part of `next` that is new against `prev`: the common prefix and suffix
 * are cut off (the suffix never overlapping the prefix). Null when nothing
 * was inserted (a pure deletion or no change).
 */
export function insertedSpan(prev: string, next: string): TextSpan | null {
  const max = Math.min(prev.length, next.length);
  let start = 0;
  while (start < max && prev[start] === next[start]) start++;
  let suffix = 0;
  while (suffix < max - start && prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  const end = next.length - suffix;
  return end > start ? {start, end} : null;
}

/** Whether `span` holds more than one character - recognition or Paste, not typing. */
export function isBurst(span: TextSpan | null): boolean {
  return span !== null && span.end - span.start > 1;
}

/** A character that ends a tag being typed: whitespace or punctuation other than the tag's own `-`, `/` and `:`. */
const TAG_END_RE = /[\s.,;!?)\]}"'»“”]/;

/**
 * The tags a typed character in `span` ended: the tag right before it, when
 * the character is a space or punctuation. Empty for a burst, or for a
 * character that continues a word.
 */
export function tagsEndedBy(next: string, span: TextSpan | null): TextSpan[] {
  if (!span || span.end - span.start !== 1 || !TAG_END_RE.test(next[span.start])) return [];
  const ended = tagSpans(next).find(t => t.end === span.start);
  return ended ? [{start: ended.start, end: ended.end}] : [];
}
