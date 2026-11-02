/**
 * Chips that page instead of being cut (docs/dev/history/technical-design-contexts-tags.md §8): the
 * grid lays out the chips from the page's first one, measures where each lands and shows only those
 * that fit whole in the box (`chipsThatFit`); › starts the next page at the first one that didn't.
 * Measuring the real layout keeps it right at any font scale and screen size. Until the first
 * measurement every chip shows (clipped by the box), as in tests, where nothing is laid out.
 *
 * `useChipPages` holds the paging, so the caller can put `ChipPager` (‹ ›, no "page n of m", as in
 * ui/PagedSection.tsx) wherever there is room - e.g. at the right of a tab row.
 */
import React, {useEffect, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import {chipsThatFit} from '../domain/screenLayout';
import {requestEinkRefresh} from '../utils/screenRefresh';
import TagChipGrid, {GridChip} from './TagChipGrid';
import {FONT} from './theme';

/** Upper bound of chips laid out for one page; far more than any box holds. */
const MAX_PAGE_CHIPS = 120;

export interface ChipPages {
  start: number;
  visibleCount: number | null;
  hasPrev: boolean;
  hasNext: boolean;
  prev: () => void;
  next: () => void;
  onBoxLayout: (e: LayoutChangeEvent) => void;
  onChipLayout: (index: number, bottom: number) => void;
}

/** Paging over `total` chips; back to the first page whenever `resetKey` changes. */
export function useChipPages(total: number, resetKey: string): ChipPages {
  const [starts, setStarts] = useState<number[]>([0]);
  const [box, setBox] = useState<number | null>(null);
  const [bottoms, setBottoms] = useState<Record<number, number>>({});
  useEffect(() => {
    setStarts([0]);
    setBottoms({});
  }, [resetKey]);
  const start = Math.min(starts[starts.length - 1], Math.max(0, total - 1));
  const shown = Math.min(total - start, MAX_PAGE_CHIPS);
  const visibleCount = chipsThatFit(
    Array.from({length: shown}, (_, i) => bottoms[i]),
    box,
  );
  useEffect(() => {
    if (visibleCount !== null) requestEinkRefresh();
  }, [visibleCount, start]);
  return {
    start,
    visibleCount,
    hasPrev: starts.length > 1,
    hasNext: visibleCount !== null && start + visibleCount < total,
    prev: () => {
      setStarts(s => (s.length > 1 ? s.slice(0, -1) : s));
      setBottoms({});
    },
    next: () => {
      if (visibleCount === null) return;
      setStarts(s => [...s, start + visibleCount]);
      setBottoms({});
    },
    onBoxLayout: e => {
      const h = e.nativeEvent.layout.height;
      setBox(b => (b === h ? b : h));
    },
    onChipLayout: (index, bottom) => setBottoms(b => (b[index] === bottom ? b : {...b, [index]: bottom})),
  };
}

export function ChipPager({pages, textColor}: {pages: ChipPages; textColor: string}): React.JSX.Element | null {
  if (!pages.hasPrev && !pages.hasNext) return null;
  const arrow = (label: string, enabled: boolean, onPress: () => void, name: string) => (
    <Pressable onPress={onPress} disabled={!enabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={name}>
      <Text style={[styles.arrow, {color: textColor}, !enabled && styles.disabled]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.pager}>
      {arrow('‹', pages.hasPrev, pages.prev, 'Previous chips')}
      {arrow('›', pages.hasNext, pages.next, 'Next chips')}
    </View>
  );
}

interface Props {
  chips: GridChip[];
  pages: ChipPages;
  maxLabelChars?: number;
  textColor: string;
  borderColor: string;
}

/** The current page of `chips`; the box takes the room it is given (flex: 1). */
export default function PagedChipGrid({chips, pages, maxLabelChars = 24, textColor, borderColor}: Props): React.JSX.Element {
  return (
    <View style={styles.box} onLayout={pages.onBoxLayout}>
      <TagChipGrid
        chips={chips.slice(pages.start, pages.start + MAX_PAGE_CHIPS)}
        maxChips={MAX_PAGE_CHIPS}
        maxLabelChars={maxLabelChars}
        onChipLayout={pages.onChipLayout}
        visibleCount={pages.visibleCount}
        textColor={textColor}
        borderColor={borderColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {flex: 1, overflow: 'hidden'},
  pager: {flexDirection: 'row', alignItems: 'center'},
  arrow: {fontSize: FONT.large, fontWeight: '700', paddingHorizontal: 12},
  disabled: {opacity: 0.3},
});
