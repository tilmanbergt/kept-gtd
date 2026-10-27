/**
 * Daily's display-mode row above the two columns
 * (docs/dev/history/technical-design-pagination-fixed-height.md §3.1): the tag
 * filter pill on the left (technical-design-context-tags.md §6 - inactive a
 * quiet "#", set only by tapping a tag in a row; active a filled pill naming
 * the tag, with ✕) and the Focus mode button on the right.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {COLORS, FONT} from '../../ui/theme';

interface Props {
  tagFilter: string | null;
  onClearTagFilter: () => void;
  onEnterFocusMode?: () => void;
  textColor: string;
  borderColor: string;
}

export default function DailyModeRow({tagFilter, onClearTagFilter, onEnterFocusMode, textColor, borderColor}: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      {tagFilter ? (
        <Pressable onPress={onClearTagFilter} hitSlop={8} style={styles.pillActive}>
          <Text style={styles.pillActiveText}>#{tagFilter}</Text>
          <Text style={styles.pillActiveClear}>✕</Text>
        </Pressable>
      ) : (
        <View style={[styles.pillInactive, {borderColor}]}>
          <Text style={[styles.pillInactiveText, {color: textColor}]}>#</Text>
        </View>
      )}
      {onEnterFocusMode && (
        <Pressable onPress={onEnterFocusMode} hitSlop={8} style={[styles.focusButton, {borderColor}]}>
          <Text style={[styles.focusButtonText, {color: textColor}]}>Focus mode</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
  pillInactive: {width: 24, height: 24, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  pillInactiveText: {fontSize: FONT.small, opacity: 0.5},
  pillActive: {flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4},
  pillActiveText: {fontSize: FONT.small, fontWeight: '600', color: COLORS.accentText},
  pillActiveClear: {fontSize: FONT.small, color: COLORS.accentText, opacity: 0.7, marginLeft: 6},
  focusButton: {borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4},
  focusButtonText: {fontSize: FONT.small, fontWeight: '600'},
});
