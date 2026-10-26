/**
 * Small shared hook that reads a View's real, laid-out height via React
 * Native's own `onLayout` callback. Wrap the box whose remaining size you
 * want in a `{flex: 1}` View (flexbox shrinks it to whatever is left after
 * its non-flexible siblings), pass this hook's `onLayout` to that View, and
 * read `height` back.
 *
 * It is a pure read of layout RN already computes on every render: no new
 * layout model, and no change to sibling components' styles. `height` stays
 * `null` until RN's first layout pass completes, so there is always one
 * render before the real number is known.
 *
 * A real flexbox measurement is more reliable than hand-summed pixel
 * "chrome budget" constants, which drift from reality in ways that are hard
 * to catch by eye. It is its own tiny hook rather than part of
 * `ui/PagedSection.tsx`: it wraps the box *around* a `PagedSection` (or any
 * other fixed-size box) and does not change what `PagedSection` does with
 * the `viewportHeight` number it is given.
 */
import {useCallback, useState} from 'react';
import {LayoutChangeEvent} from 'react-native';
import {perfMark} from '../utils/perf';

/**
 * The last height measured per key, for this session
 * (docs/dev/history/technical-design-perf-current-page.md §3.5): a box that was measured
 * before starts with that height, so a list in it pages once - and not at all again
 * when the new measurement is the same. `memoKey` may list keys, most specific first
 * (one item's page, then any page of that kind): the box starts with the first one
 * known, and every measurement is kept under all of them. A wrong start (the layout
 * differs this time) is corrected by the first measurement, as without a key.
 */
const remembered = new Map<string, number>();

export function useMeasuredHeight(memoKey?: string | readonly string[]): [(e: LayoutChangeEvent) => void, number | null] {
  const keys: readonly string[] = memoKey === undefined ? [] : typeof memoKey === 'string' ? [memoKey] : memoKey;
  const keysId = keys.join('\n');
  const [height, setHeight] = useState<number | null>(() => {
    for (const key of keys) {
      const known = remembered.get(key);
      if (known !== undefined) return known;
    }
    return null;
  });
  // Guard against redundant state updates (onLayout can fire again with an
  // unchanged value, e.g. when an unrelated sibling re-renders) - avoids an
  // extra render/repagination pass for a size that didn't actually change.
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const measured = e.nativeEvent.layout.height;
    // A hidden kept tab (display: 'none', docs/dev/technical-design-keep-tabs-
    // alive.md §5.4) reports 0 - keep the last real height so the screen
    // paginates correctly the moment it is shown again. 0 is never a
    // meaningful list viewport, so this changes nothing elsewhere.
    if (measured <= 0) return;
    perfMark('layout:measured', {height: measured});
    for (const key of keysId ? keysId.split('\n') : []) remembered.set(key, measured);
    setHeight(prev => (prev === measured ? prev : measured));
  }, [keysId]);
  return [onLayout, height];
}
