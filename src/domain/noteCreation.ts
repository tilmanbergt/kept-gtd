/**
 * Supernote's limit on creating notes (docs/dev/history/technical-design-launch-ready.md §3,
 * docs/dev/supernote-host-facts.md §2): `createNote` works only when the plugin was opened
 * from a note. Opened from a PDF or EPUB, the host refuses with "This app is not allowed to use
 * this API". Kept says so in plain words - before trying where it knows the launch file, and in
 * place of the host's text when the host refuses anyway.
 */
import {NoteCreationPlan} from './noteCreationPlan';

export type LaunchKind = 'note' | 'document' | 'unknown';

/** What Kept was opened from: a `.note` is a note, any other file a document (PDF, EPUB …), no path unknown. */
export function launchKind(path: string | null | undefined): LaunchKind {
  if (!path) return 'unknown';
  return path.toLowerCase().endsWith('.note') ? 'note' : 'document';
}

export const NOTE_CREATION_BLOCKED_TEXT =
  "Supernote doesn't let plugins create notes when opened from a PDF or EPUB. Open Kept from a note to create this one.";

/** The host's refusal of an API call in the current launch context. */
export function isHostCreateRefusal(message: string | null | undefined): boolean {
  return !!message && message.toLowerCase().includes('not allowed to use this api');
}

/** Thrown instead of trying (or instead of the host's text) when a note can't be created from here. */
export class NoteCreationBlockedError extends Error {
  constructor() {
    super(NOTE_CREATION_BLOCKED_TEXT);
    this.name = 'NoteCreationBlockedError';
  }
}

/** Every note file `plan` offers: its own place first, then the alternatives. */
export function planFiles(plan: NoteCreationPlan): string[] {
  return [plan, ...(plan.alternatives ?? [])].map(p => p.absolutePath);
}

/**
 * True when none of the files `plan` offers exists yet, so every choice would create a new
 * note file - the case Kept stops before asking when it was opened from a document. A plan
 * with a place in an existing file is still offered (that adds a page; no new file).
 */
export function planNeedsNewFile(plan: NoteCreationPlan, exists: ReadonlySet<string>): boolean {
  return planFiles(plan).every(path => !exists.has(path));
}
