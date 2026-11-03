/**
 * "‹ Week 44 · 26 ›" / "‹ Oct 26 ›" at the right end of the Week and Month tab rows
 * (docs/dev/history/technical-design-launch-ready.md L6b): the period's name and its arrows in
 * the row the Schedule | Google tabs already use, instead of a header line of their own. Away
 * from the current period, "Now" leads back to it.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT} from './theme';

interface Props {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** Set while another period than the current one is shown. */
  onNow?: () => void;
  textColor: string;
}

export default function PeriodNav({label, onPrev, onNext, onNow, textColor}: Props): React.JSX.Element {
  return (
    <View style={styles.nav}>
      {onNow && (
        <Pressable onPress={onNow} hitSlop={8} style={styles.now}>
          <Text style={[styles.nowText, {color: textColor}]}>Now</Text>
        </Pressable>
      )}
      <Pressable onPress={onPrev} hitSlop={8} style={styles.button} accessibilityLabel="Previous">
        <Text style={[styles.arrow, {color: textColor}]}>‹</Text>
      </Pressable>
      <Text style={[styles.label, {color: textColor}]} numberOfLines={1}>
        {label}
      </Text>
      <Pressable onPress={onNext} hitSlop={8} style={styles.button} accessibilityLabel="Next">
        <Text style={[styles.arrow, {color: textColor}]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {flexDirection: 'row', alignItems: 'center'},
  label: {fontSize: FONT.medium, fontWeight: '700'},
  button: {paddingHorizontal: 10},
  arrow: {fontSize: FONT.large, fontWeight: '700', includeFontPadding: false},
  now: {marginRight: 6},
  nowText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
});
