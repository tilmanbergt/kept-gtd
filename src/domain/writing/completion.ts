/**
 * Completing the tag at the cursor (docs/dev/history/technical-design-writing-help.md
 * §1.3, §10.4): known tags that start with what is written - the loops of the
 * place first - or, after `type/`, that type's subtags as `/name`: the ones
 * used with that type, then (for a thread type) the place's other active
 * counterparts. Spelled by domain/writing/tagCase.ts. Pure.
 */
import {KnownTagIndex} from './knownTags';
import {completionSpelling, continues} from './tagCase';

/** The unfinished tag the cursor sits right after: `start` at the `#`, `token` without it (`spa`, `101/`). */
export interface UnfinishedTag {
  start: number;
  end: number;
  token: string;
}

/** One offered completion: the tag it writes (without `#`), the button's label, and an abbreviation's Project/Area. */
export interface Completion {
  tag: string;
  label: string;
  name?: string;
}

/** The active loops and counterparts of where the item goes (storage/knownTagIndex.ts `scopeTags`), lowercase. */
export interface CompletionScope {
  /** `kind/name`. */
  loops: readonly string[];
  /** Counterpart leaves. */
  counterparts: readonly string[];
}

export const NO_SCOPE: CompletionScope = {loops: [], counterparts: []};

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

/** Plain completions shown at once; subtags (`/name`) are shorter, so one more fits. */
export const COMPLETION_LIMIT = 3;
export const SUBTAG_LIMIT = 4;

/** The subtags of `type` for `/child`, best first - see the module doc comment. */
function subtags(type: string, child: string, index: KnownTagIndex, scope: CompletionScope): string[] {
  const used = index.childrenOf(type);
  const local = new Set(scope.loops.filter(l => l.startsWith(`${type}/`)).map(l => l.slice(type.length + 1)));
  const ordered = [...used.filter(c => local.has(c)), ...used.filter(c => !local.has(c))];
  for (const c of local) if (!ordered.includes(c)) ordered.push(c);
  if (index.isThreadType(type)) for (const c of scope.counterparts) if (!ordered.includes(c)) ordered.push(c);
  return ordered.filter(c => c !== child.toLowerCase() && (!child || continues(c, child)));
}

/** The completions of `token` (as written, without `#`), best first; never `token` itself. */
export function completions(token: string, index: KnownTagIndex, scope: CompletionScope = NO_SCOPE): Completion[] {
  const slash = token.indexOf('/');
  if (slash > 0 && token.indexOf('/', slash + 1) < 0) {
    const typeWritten = token.slice(0, slash);
    const type = typeWritten.toLowerCase();
    const child = token.slice(slash + 1);
    return subtags(type, child, index, scope)
      .slice(0, SUBTAG_LIMIT)
      .map(c => {
        const tag = `${typeWritten}/${completionSpelling(token, `${type}/${c}`, index).split('/')[1]}`;
        return {tag, label: `/${tag.slice(slash + 1)}`};
      });
  }
  const lower = token.toLowerCase();
  const local = scope.loops.filter(l => l !== lower && continues(l, token));
  const known = index.complete(lower, COMPLETION_LIMIT + local.length).filter(k => !local.includes(k.tag));
  const found: Array<{tag: string; name?: string}> = [...local.map(tag => ({tag})), ...known];
  return found.slice(0, COMPLETION_LIMIT).map(k => {
    const tag = completionSpelling(token, k.tag, index);
    return k.name ? {tag, label: `#${tag}`, name: k.name} : {tag, label: `#${tag}`};
  });
}

/** `text` with the unfinished tag replaced by `#tag` and a space; the cursor after the space. */
export function applyCompletion(text: string, unfinished: Pick<UnfinishedTag, 'start' | 'end'>, tag: string): {text: string; cursor: number} {
  const after = text.slice(unfinished.end);
  const insert = `#${tag}${after.startsWith(' ') ? '' : ' '}`;
  const cursor = unfinished.start + insert.length + (after.startsWith(' ') ? 1 : 0);
  return {text: text.slice(0, unfinished.start) + insert + after, cursor};
}
