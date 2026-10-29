/**
 * The last line of a filtered tab (docs/dev/history/technical-design-time-and-place.md
 * §3.3, D24): "Hidden by Work: 9 todos · 2 loops · 1 thread · Show". Show is
 * a temporary Everything until the tab is left (ui/context/useContextMatcher.ts).
 * Nothing renders when nothing is hidden.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT} from '../theme';

interface Props {
  text: string | null;
  onShow: () => void;
  textColor: string;
}

export default function HiddenLine({text, onShow, textColor}: Props): React.JSX.Element | null {
  if (!text) return null;
  return (
    <View style={styles.row}>
      <Text style={[styles.text, {color: textColor}]} numberOfLines={1}>
        {text} ·{' '}
      </Text>
      <Pressable onPress={onShow} hitSlop={8} accessibilityRole="button">
        <Text style={[styles.text, styles.show, {color: textColor}]}>Show</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 6},
  text: {fontSize: FONT.small, flexShrink: 1},
  show: {fontWeight: '700', textDecorationLine: 'underline'},
});
