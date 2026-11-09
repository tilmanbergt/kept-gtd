/**
 * The tag check of the writing help (docs/dev/history/technical-design-writing-help.md
 * §1.1, §1.2, §1.4, §1.5). Pure.
 *
 * `normalizeTagSpacing` is the only change made without a tap: a space right
 * after `#`, a space right after a `/` inside a tag, and a full-width `＃`.
 * `checkTags` only reports - the caller changes a tag when the user taps a
 * suggestion, or applies a learned correction visibly, with Undo.
 */
import {isContextTag} from '../flowState';
import {stripSpaceAfterHash, tagSpans} from '../markdown';
import {KnownTagIndex} from './knownTags';

export type TagFindingKind = 'fix' | 'learned' | 'new';

/** One checked tag: where it is (`start` at the `#`), as written, and what to write instead. */
export interface TagFinding {
  start: number;
  end: number;
  /** The tag as written, without `#`. */
  written: string;
  /** The tag to write instead, without `#`; null for a new tag with nothing close. */
  suggestion: string | null;
  kind: TagFindingKind;
}

/** A range of the text: `start` inclusive, `end` exclusive. */
export interface TextSpan {
  start: number;
  end: number;
}

// A space after a `/` that follows a tag's word, then the next word: `#1o1/ Mieke`.
const SPACE_AFTER_SLASH_RE = /(#[a-z0-9][\w-]*(?:\/[\w-]+)*\/)\s+(?=[\w-])/gi;

/** The two silent spacing fixes plus `＃` -> `#` (§1.1 point 2). */
export function normalizeTagSpacing(text: string): string {
  return stripSpaceAfterHash(text.replace(/＃/g, '#')).replace(SPACE_AFTER_SLASH_RE, '$1');
}

/**
 * The tag to write instead of the unknown `written`, or null when nothing
 * known is close. Nested tags are fixed per part (§1.2 "Subtags"): a known
 * part keeps its spelling, a fixed part takes the known one.
 */
export function suggestionFor(written: string, index: KnownTagIndex): string | null {
  const parts = written.split('/');
  if (parts.length === 1) return index.bestTop(written);
  const [parentWritten, childWritten, ...rest] = parts;
  const parent = index.has(parentWritten) ? parentWritten : index.bestTop(parentWritten);
  if (!parent) return null;
  const child = index.hasChild(parent, childWritten) ? childWritten : index.bestChild(parent, childWritten) ?? childWritten;
  const suggestion = [parent, child, ...rest].join('/');
  return suggestion.toLowerCase() === written.toLowerCase() ? null : suggestion;
}

/** Whether the writing help leaves `tag` (lowercase) alone: `#next`, `#wf/…`, `#due:…` and every tag with `:`. */
export function isUncheckedTag(tag: string): boolean {
  return tag.includes(':') || !isContextTag(tag);
}

/**
 * The tags of `text` that lie in `span` (all of them when `span` is null),
 * in text order, each checked: a learned correction, a known tag (left out),
 * a fix, or a new tag. Tags the user kept in this draft (`kept`, lowercase)
 * and unchecked tags are left out.
 */
export function checkTags(
  text: string,
  span: TextSpan | null,
  index: KnownTagIndex,
  kept: ReadonlySet<string>,
  learned: ReadonlyMap<string, string>,
): TagFinding[] {
  const findings: TagFinding[] = [];
  for (const t of tagSpans(text)) {
    if (span && (t.end <= span.start || t.start >= span.end)) continue;
    const lower = t.tag.toLowerCase();
    if (isUncheckedTag(lower) || kept.has(lower)) continue;
    const taught = learned.get(lower);
    if (taught !== undefined && taught.toLowerCase() !== lower) {
      findings.push({start: t.start, end: t.end, written: t.tag, suggestion: taught, kind: 'learned'});
      continue;
    }
    if (index.has(lower)) continue;
    const suggestion = suggestionFor(t.tag, index);
    findings.push({start: t.start, end: t.end, written: t.tag, suggestion, kind: suggestion ? 'fix' : 'new'});
  }
  return findings;
}

/** `text` with the tag at `finding` replaced by `#to`; the cursor right after it. */
export function replaceTag(text: string, finding: Pick<TagFinding, 'start' | 'end'>, to: string): {text: string; cursor: number} {
  const replacement = `#${to}`;
  return {text: text.slice(0, finding.start) + replacement + text.slice(finding.end), cursor: finding.start + replacement.length};
}
