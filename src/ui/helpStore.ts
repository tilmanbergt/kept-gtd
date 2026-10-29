/**
 * Opening the in-app help at a page from anywhere (the setup assistant's
 * ? Help, docs/dev/history/technical-design-easy-start.md §5.3): a tiny module
 * store like ui/overviewStore.ts; screens/useAppOverlays.tsx opens the help
 * for each new request.
 */
import {useSyncExternalStore} from 'react';
import {HelpLinkTarget} from '../domain/markdownBlocks';

export interface HelpRequest extends HelpLinkTarget {
  nonce: number;
}

let current: HelpRequest | null = null;
let nonce = 0;
const listeners = new Set<() => void>();

/** Opens the help at `page` (a docs/user page id), at the heading `anchor` when given. */
export function requestHelp(page: string, anchor: string | null = null): void {
  nonce += 1;
  current = {page, anchor, nonce};
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHelpRequest(): HelpRequest | null {
  return useSyncExternalStore(subscribe, () => current);
}
