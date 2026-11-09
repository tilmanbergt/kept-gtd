/**
 * Completing the tag at the cursor (docs/dev/history/technical-design-writing-help.md
 * §1.3): up to three known tags that start with what is written, or after
 * `type/` the counterparts of that type, most recent first. Pure.
 */
import {KnownTag, KnownTagIndex} from './knownTags';

/** The unfinished tag the cursor sits right after: `start` at the `#`, `token` without it (`spa`, `101/`). */
export interface UnfinishedTag {
  start: number;
  end: number;
  token: string;
}

const TAG_BEFORE_CURSOR_RE = /#([a-z0-9][\w-]*(?:\/[\w-]*)*)$/i;

/** The tag that ends at `cursor` with no word character right after it, or null. */
export function unfinishedTagAt(text: string, cursor: number): UnfinishedTag | null {
  if (cursor < 0 || cursor > text.length) return null;
  if (cursor < text.length && /[\w/-]/.test(text[cursor])) return null;
  const match = TAG_BEFORE_CURSOR_RE.exec(text.slice(0, cursor));
  if (!match) return null;
  // `C#5` is a tag for the parser, but no one completes it.
  const start = cursor - match[0].length;
  if (start > 0 && /\w/.test(text[start - 1])) return null;
  return {start, end: cursor, token: match[1]};
}

export const COMPLETION_LIMIT = 3;

/** The known tags `token` can be completed to, best first; never `token` itself. */
export function completions(token: string, index: KnownTagIndex, limit = COMPLETION_LIMIT): KnownTag[] {
  const lower = token.toLowerCase();
  if (lower.endsWith('/')) {
    const type = lower.slice(0, -1);
    if (!type || type.includes('/')) return [];
    return index
      .childrenOf(type)
      .slice(0, limit)
      .map(child => ({tag: `${type}/${child}`}));
  }
  return index.complete(lower, limit);
}

/** `text` with the unfinished tag replaced by `#tag` and a space; the cursor after the space. */
export function applyCompletion(text: string, unfinished: Pick<UnfinishedTag, 'start' | 'end'>, tag: string): {text: string; cursor: number} {
  const after = text.slice(unfinished.end);
  const insert = `#${tag}${after.startsWith(' ') ? '' : ' '}`;
  const cursor = unfinished.start + insert.length + (after.startsWith(' ') ? 1 : 0);
  return {text: text.slice(0, unfinished.start) + insert + after, cursor};
}
