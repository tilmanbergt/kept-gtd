/**
 * The starters on an empty title field (docs/dev/history/technical-design-calmer-screens.md
 * §3.3): **Thread** and **Loop** open a short list of the first Note setups of
 * that kind, each labelled by its first tag (`#sparring`); a tap inserts the
 * tag with a `/` (`#sparring/`), so the writing help's completion offers the
 * counterparts or loops that follow. Pure.
 */
import {NoteSetup} from '../noteSetups';

export type StarterKind = 'thread' | 'loop';

export interface StarterOption {
  /** The setup's first tag, without `#`. */
  tag: string;
  /** What a tap inserts at the cursor. */
  insert: string;
}

/** The most options a starter list shows. */
export const STARTER_LIMIT = 3;

/** The first tag of each enabled setup of `kind`, in Note setups order, at most `limit`. */
export function starterOptions(setups: readonly NoteSetup[], kind: StarterKind, limit = STARTER_LIMIT): StarterOption[] {
  const out: StarterOption[] = [];
  for (const setup of setups) {
    if (!setup.enabled || setup.kind !== kind) continue;
    const tag = setup.tags[0]?.replace(/^#/, '').toLowerCase();
    if (!tag || out.some(o => o.tag === tag)) continue;
    out.push({tag, insert: `#${tag}/`});
    if (out.length >= limit) break;
  }
  return out;
}

/** Which starters the strip offers: Thread and Loop where a setup of that kind exists, Paste while the clipboard has text. */
export function startersOffered(setups: readonly NoteSetup[], clipboardHasText: boolean): {thread: boolean; loop: boolean; paste: boolean} {
  return {
    thread: starterOptions(setups, 'thread', 1).length > 0,
    loop: starterOptions(setups, 'loop', 1).length > 0,
    paste: clipboardHasText,
  };
}

/** `text` with `insert` at `cursor` (a space before it where a word ends there), and the cursor after it. */
export function insertStarter(text: string, cursor: number | null, insert: string): {text: string; cursor: number} {
  const at = cursor === null ? text.length : Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, at);
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const next = `${before}${lead}${insert}${text.slice(at)}`;
  return {text: next, cursor: at + lead.length + insert.length};
}
