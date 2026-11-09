/**
 * How the writing help spells a tag it writes (docs/dev/history/technical-design-writing-help.md
 * §10.4): what the user wrote keeps its letters exactly; what Kept adds is
 * lower case - except a Project/Area abbreviation, always upper case, and a
 * counterpart the user has not started writing, which starts upper case
 * (`/Mieke`). Tags are compared without case everywhere, so this is only how
 * the text reads. Pure.
 */
import {KnownTagIndex} from './knownTags';
import {tagSkeleton} from './tagSkeleton';

function capitalize(word: string): string {
  return word ? word[0].toUpperCase() + word.slice(1) : word;
}

/** Whether the first letter of `written` is upper case (digits and signs don't count). */
function startsUpper(written: string): boolean {
  const letter = /\p{L}/u.exec(written)?.[0];
  return !!letter && letter !== letter.toLowerCase();
}

/**
 * The completion of `written` (the unfinished tag as written, without `#`) to
 * the known `known` (lowercase): each written segment kept as written where
 * the known one continues it, the rest lower case.
 */
export function completionSpelling(written: string, known: string, index: Pick<KnownTagIndex, 'isAbbrev' | 'isThreadType'>): string {
  if (index.isAbbrev(known)) return known.toUpperCase();
  const typed = written.split('/');
  return known
    .split('/')
    .map((segment, i) => {
      const w = typed[i];
      if (w) {
        if (segment.startsWith(w.toLowerCase())) return w + segment.slice(w.length);
        // A skeleton match (`5pa` for `spa`): Kept's letters, the first one as the user's.
        return startsUpper(w) ? capitalize(segment) : segment;
      }
      return i === 1 && index.isThreadType(known.split('/')[0]) ? capitalize(segment) : segment;
    })
    .join('/');
}

/**
 * A fix of `written` to `suggestion`: a segment that only differs in case
 * stays as written; a changed one is lower case, upper-case first when the
 * written one was. An abbreviation is upper case.
 */
export function fixSpelling(written: string, suggestion: string, index: Pick<KnownTagIndex, 'isAbbrev'>): string {
  if (index.isAbbrev(suggestion)) return suggestion.toUpperCase();
  const typed = written.split('/');
  return suggestion
    .split('/')
    .map((segment, i) => {
      const w = typed[i];
      if (w === undefined) return segment;
      if (w.toLowerCase() === segment.toLowerCase()) return w;
      const lower = segment.toLowerCase();
      return startsUpper(w) ? capitalize(lower) : lower;
    })
    .join('/');
}

/** Whether `candidate` (lowercase) continues `prefix` - by its letters, or by its handwriting skeleton. */
export function continues(candidate: string, prefix: string): boolean {
  const lower = prefix.toLowerCase();
  return candidate.startsWith(lower) || tagSkeleton(candidate).startsWith(tagSkeleton(lower));
}
