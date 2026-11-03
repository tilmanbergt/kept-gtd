/**
 * Says in the status slot when a note page got fewer pieces than its setup has
 * because they would not fit (a horizontal page,
 * docs/dev/history/technical-design-launch-ready.md §5.1).
 */
import {useEffect, useState} from 'react';
import {subscribeSkippedPieces} from '../storage/pageFrames';
import {useStatus} from './status/StatusProvider';

export function pageFitText(count: number): string {
  return count === 1
    ? "1 piece of the note setup didn't fit on this page and was left out."
    : `${count} pieces of the note setup didn't fit on this page and were left out.`;
}

export function usePageFitNotice(): void {
  const [count, setCount] = useState(0);
  useEffect(() => subscribeSkippedPieces(setCount), []);
  useStatus('app.pageFitNotice', count > 0 ? {kind: 'info', scope: 'global', text: pageFitText(count), onDismiss: () => setCount(0)} : null);
}
