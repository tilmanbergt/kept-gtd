/**
 * The page arrows of a list without a header (ui/PagedSection.tsx,
 * docs/dev/history/technical-design-quickadd-redesign.md §3.8 F6): one row
 * below the list, right-aligned `‹  2 / 3  ›`. PagedSection draws it only
 * when the list has more than one page; an arrow that can't act is left out,
 * the page count always shows.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT} from './theme';

/** The row's fixed height; PagedSection reserves it inside its viewport. */
export const PAGE_NAV_ROW_HEIGHT = 30;

interface Props {
  page: number;
  pages: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  textColor: string;
}

function PageNavRow({page, pages, canPrev, canNext, onPrev, onNext, textColor}: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} disabled={!canPrev} hitSlop={8} style={styles.arrowButton} accessibilityLabel="Previous page">
        <Text style={[styles.arrow, {color: textColor}]}>{canPrev ? '‹' : ' '}</Text>
      </Pressable>
      <Text style={[styles.count, {color: textColor}]}>
        {page + 1} / {pages}
      </Text>
      <Pressable onPress={onNext} disabled={!canNext} hitSlop={8} style={styles.arrowButton} accessibilityLabel="Next page">
        <Text style={[styles.arrow, {color: textColor}]}>{canNext ? '›' : ' '}</Text>
      </Pressable>
    </View>
  );
}

export default React.memo(PageNavRow);

const styles = StyleSheet.create({
  row: {height: PAGE_NAV_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'},
  arrowButton: {paddingHorizontal: 6},
  // A fixed width, so the count doesn't move when an arrow leaves at the first or last page.
  arrow: {fontSize: FONT.medium, fontWeight: '700', width: 24, textAlign: 'center'},
  count: {fontSize: FONT.small, opacity: 0.7},
});
