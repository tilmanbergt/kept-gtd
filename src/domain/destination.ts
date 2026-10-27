import {ItemStatus} from './types';

/**
 * The "where should this new Task/Meeting go" destination a user picks when
 * creating one outside its own Project/Area file - Inbox, or any Project/
 * Area. Shared between CaptureScreen (Lasso capture) and DailyView (its own
 * on-page quick-add), so the two pickers can never drift on what counts as
 * "the same destination" or how one is labeled. Deliberately just this pure
 * logic - the expandable-list picker UI itself stays a local, per-screen
 * component in each file (design-overview.md §3's per-screen-styling
 * convention: presentation isn't shared, logic that must stay identical is).
 */
export type Destination =
  | {type: 'inbox'}
  | {type: 'item'; kind: 'project' | 'area'; name: string; path: string};

export function destinationLabel(destination: Destination): string {
  return destination.type === 'inbox' ? 'Inbox' : destination.name;
}

export function sameDestination(a: Destination, b: Destination): boolean {
  if (a.type === 'inbox' || b.type === 'inbox') return a.type === b.type;
  return a.path === b.path;
}

interface DestinationCandidate {
  status: ItemStatus;
}

/**
 * Which of `items` (already filtered to one kind by the caller - a
 * Projects list, or an Areas list) are valid quick-add/capture
 * destinations, in the caller's order (alphabetical, from the native folder
 * listing).
 *
 * Excludes anything not Active - On Hold/Done/Archived items are never
 * offered as a place to file a new Task/Meeting (technical-design-status-archive.md §6).
 * Used by both CaptureScreen.tsx and DailyView.tsx's quick-add so the two
 * pickers can't drift on this rule either, same reasoning as the rest of
 * this file.
 */
export function destinationCandidates<T extends DestinationCandidate>(items: T[]): T[] {
  return items.filter(item => item.status === 'active');
}
