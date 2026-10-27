/**
 * Focus blocks (docs/dev/history/technical-design-time-and-place.md §3.1,
 * requirements D6-D10): a meeting that is time for yourself with a loop,
 * thread, project or area - marked by the bare tag `#focusblock` on its line,
 * so files, Obsidian and older builds read it as an ordinary meeting. The
 * twin of domain/monthHighlight.ts: the tag is machine-managed, toggled by
 * Quick Add's F and shown as an F mark, never as title text. Pure.
 */
import {hasBareTag, setBareTag} from './flowState';
import {Meeting} from './types';

export const FOCUS_BLOCK_TAG = 'focusblock';

export function isFocusBlock(meeting: Pick<Meeting, 'tags'>): boolean {
  return hasBareTag(meeting.tags, FOCUS_BLOCK_TAG);
}

/** `title` with `#focusblock` added (on) or removed (off). */
export function setFocusBlock(title: string, on: boolean): string {
  return setBareTag(title, FOCUS_BLOCK_TAG, on);
}
