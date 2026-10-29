/**
 * The back row above a meeting's context panel on Week and Month
 * (docs/dev/history/technical-design-time-and-place.md §3.2, D15):
 * "‹ Back to Week 44" on the left returns to the screen's normal right side,
 * "Tue 27.10. · 8 meetings ›" on the right opens that day's panel.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT} from '../theme';

interface Props {
  backLabel: string;
  onBack: () => void;
  dayLabel: string;
  onDay: () => void;
  textColor: string;
  borderColor: string;
}

export default function ContextBackRow({backLabel, onBack, dayLabel, onDay, textColor, borderColor}: Props): React.JSX.Element {
  return (
    <View style={[styles.row, {borderBottomColor: borderColor}]}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.target}>
        <Text style={[styles.text, {color: textColor}]} numberOfLines={1}>
          ‹ {backLabel}
        </Text>
      </Pressable>
      <Pressable onPress={onDay} hitSlop={8} style={[styles.target, styles.right]}>
        <Text style={[styles.text, {color: textColor}]} numberOfLines={1}>
          {dayLabel} ›
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, marginBottom: 4},
  target: {paddingVertical: 6},
  right: {marginLeft: 'auto', paddingLeft: 12},
  text: {fontSize: FONT.small, fontWeight: '600'},
});
