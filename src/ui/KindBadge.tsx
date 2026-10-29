/**
 * The kind of an owner as a small-caps badge - AREA, PROJECT, THREAD, LOOP,
 * COUNTERPART (docs/dev/history/technical-design-time-and-place.md §10 C10):
 * capitals, the first letter a size larger, right of the name it belongs to,
 * so the name reads first. One component wherever a kind is labelled: Given
 * time rows, the context panel's header, Engage's header and a Project's or
 * Area's page.
 */
import React from 'react';
import {StyleSheet, Text} from 'react-native';

const FIRST_PX = 13;
const REST_PX = 10;

export default function KindBadge({label, textColor}: {label: string; textColor: string}): React.JSX.Element {
  const upper = label.toUpperCase();
  return (
    <Text style={[styles.badge, {color: textColor}]} numberOfLines={1} accessibilityLabel={label}>
      <Text style={styles.first}>{upper.slice(0, 1)}</Text>
      {upper.slice(1)}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {fontSize: REST_PX, fontWeight: '600', letterSpacing: 0.8, marginLeft: 8, includeFontPadding: false},
  first: {fontSize: FIRST_PX},
});
