/**
 * Re-renders the calling component when `signature()` - a string computed
 * from the cache (storage/dataCache.ts) - changes, and only then; returns the
 * current signature. For a component that shows a few facts derived from the
 * cache and should not redraw for the rest (task edits, the background
 * rebuild), the way ui/useAbbrevItems.ts does it for abbreviations.
 * Paused while a kept tab is hidden, checked once on show
 * (docs/dev/history/technical-design-keep-tabs-alive.md §5.1).
 */
import {useEffect, useRef, useState} from 'react';
import {subscribeCache} from '../storage/dataCache';
import {useScreenActivity} from './screenActivity';

export function useCacheSignature(signature: () => string): string {
  const [, setTick] = useState(0);
  const activity = useScreenActivity();
  const current = signature();
  const signatureRef = useRef(signature);
  signatureRef.current = signature;
  const renderedRef = useRef(current);
  renderedRef.current = current;

  useEffect(() => {
    const check = () => {
      if (!activity.isActive()) return;
      if (signatureRef.current() !== renderedRef.current) setTick(t => t + 1);
    };
    // A change may have landed between render and subscription (effects run after paint).
    check();
    const unsubscribeCache = subscribeCache(check);
    const unsubscribeActivity = activity.subscribe(active => {
      if (active) check();
    });
    return () => {
      unsubscribeCache();
      unsubscribeActivity();
    };
  }, [activity]);

  return current;
}
