/**
 * Which strip of Quick Add's form shows
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.2, D3): the
 * focused field decides - a date, time or valid-till field of row 3 its
 * strip over row 2, else the text field its strip above the box - at most
 * one at a time, and none while the status slot holds an error, a confirm
 * or a modal (`useStatusBlocking`, read by each strip itself, so a status
 * change re-renders the strips and not Quick Add). The strips stay mounted;
 * this only says which may show.
 */
import {useStatusBlocking} from '../../status/StatusProvider';

export type WhenFocus = 'date' | 'time' | 'valid' | null;

export interface StripVisibility {
  text: boolean;
  date: boolean;
  time: boolean;
  valid: boolean;
}

/** The pure rule: `when` wins over the text field; a blocking status hides both. */
export function stripVisibility(textFocused: boolean, when: WhenFocus, blocking: boolean): StripVisibility {
  if (blocking) return {text: false, date: false, time: false, valid: false};
  return {text: textFocused && when === null, date: when === 'date', time: when === 'time', valid: when === 'valid'};
}

/** A strip's `visible` once the status slot has had its say (D3). */
export function useUnblocked(visible: boolean): boolean {
  const blocking = useStatusBlocking();
  return visible && !blocking;
}
