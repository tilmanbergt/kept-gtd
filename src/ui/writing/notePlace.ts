/**
 * Where the page of the item being entered would go, for the writing help's
 * feedback line (docs/dev/history/technical-design-writing-help.md §1.7,
 * §3.4): the destination the draft's text picks (an abbreviation tag files
 * it elsewhere), then storage/noteTargets.ts's `notePlaceOf` - the note
 * icon's own placement.
 */
import {resolveAbbrevFileTarget} from '../../domain/abbrev';
import {isValidIsoDate} from '../../domain/dateNudge';
import {Destination} from '../../domain/destination';
import {extractContextTags} from '../../domain/markdown';
import {todayIso} from '../../domain/meetingTime';
import {CachedItem} from '../../storage/dataCache';
import {notePlaceOf} from '../../storage/noteTargets';
import {peekSettings} from '../../storage/settingsSnapshot';
import {abbrevDestination} from '../quickAdd/types';

export interface DraftPlaceInput {
  text: string;
  abbrevItems: CachedItem[];
  excludePath: string | null;
  fixedDestination: Destination;
  pageKind: 'meeting' | 'todo';
  /** A meeting's date; today when it is not a date yet. */
  date?: string;
}

/** The Project/Area the draft's item goes to - its abbreviation tag's, else the screen's - or null for the Inbox. */
export function draftScope(input: Pick<DraftPlaceInput, 'text' | 'abbrevItems' | 'excludePath' | 'fixedDestination'>): string | null {
  const target = resolveAbbrevFileTarget(input.text, input.abbrevItems, input.excludePath);
  if (target) return target.path;
  return input.fixedDestination.type === 'item' ? input.fixedDestination.path : null;
}

/** `{setupName, file}` of the best note place for the draft, or null without settings. */
export function draftNotePlace(input: DraftPlaceInput): {setupName: string | null; file: string} | null {
  const settings = peekSettings();
  if (!settings) return null;
  const target = resolveAbbrevFileTarget(input.text, input.abbrevItems, input.excludePath);
  const destination = target ? abbrevDestination(target) : input.fixedDestination;
  const inbox = destination.type === 'inbox';
  return notePlaceOf({
    itemPath: inbox ? '' : destination.path,
    tags: extractContextTags(input.text),
    pageKind: input.pageKind,
    settings,
    fileDate: input.date && isValidIsoDate(input.date) ? input.date : todayIso(),
    forceOwn: inbox,
  });
}
