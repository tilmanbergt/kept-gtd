/**
 * The todos ticked done on this screen (docs/dev/history/technical-design-calmer-screens.md
 * §3.5, D11): they stay in their list, struck through, until the count tab
 * changes, the screen is left (ui/screenActivity.ts) or it unmounts. Keys are
 * the screen's own (`<path>#<index>` on Daily, the index on Current).
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useOnScreenHide} from './screenActivity';

const EMPTY: ReadonlySet<never> = new Set();

export function useJustDone<K>(tab: string) {
  const [keys, setKeys] = useState<ReadonlySet<K>>(EMPTY);
  const add = useCallback((key: K) => setKeys(prev => (prev.has(key) ? prev : new Set([...prev, key]))), []);
  const clear = useCallback(() => setKeys(prev => (prev.size === 0 ? prev : EMPTY)), []);
  // Another tab ends the moment; the first render is not a change.
  const tabRef = useRef(tab);
  useEffect(() => {
    if (tabRef.current !== tab) clear();
    tabRef.current = tab;
  }, [tab, clear]);
  useOnScreenHide(clear);
  return {keys, add, clear};
}
