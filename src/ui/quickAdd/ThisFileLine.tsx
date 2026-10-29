/**
 * Quick Add's This-file line (requirement L4; docs/dev/history/technical-design-easy-start.md §6.4):
 * in create mode on the Todo and Meeting tabs, when Kept was opened from a note
 * or document, it offers that file as the new entry's linked file - with the
 * page Kept was opened on, without a page, or not at all. It starts with the
 * page for a document and off for a note (domain/linkTargets.ts). It sits in
 * row 4, before the screen's grey line when there is one.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ThisFileTargets} from '../../domain/linkTargets';
import {ClipIcon} from '../icons';
import {COLORS, FONT, RADII} from '../theme';
import {QUICK_ADD_CHIP_PADDING} from './QuickAddFrame';

export type ThisFileMode = 'off' | 'page' | 'file';

/** The mode a new target starts in. */
export function startMode(targets: ThisFileTargets, startsOn: boolean): ThisFileMode {
  if (!startsOn) return 'off';
  return targets.withPage ? 'page' : 'file';
}

/** The file a new entry links in `mode`, absolute, or null when off. */
export function linkedPathFor(targets: ThisFileTargets | null, mode: ThisFileMode): string | null {
  if (!targets || mode === 'off') return null;
  return mode === 'page' ? targets.withPage ?? targets.withoutPage : targets.withoutPage;
}

interface Props {
  targets: ThisFileTargets;
  mode: ThisFileMode;
  onChange: (mode: ThisFileMode) => void;
  textColor: string;
  borderColor: string;
}

export default function ThisFileLine({targets, mode, onChange, textColor, borderColor}: Props): React.JSX.Element {
  const chip = (key: ThisFileMode, label: string) => {
    const on = mode === key;
    return (
      <Pressable
        key={key}
        onPress={() => onChange(on ? 'off' : key)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{selected: on}}
        style={[styles.chip, {borderColor: on ? COLORS.accent : borderColor}, on && styles.chipOn]}>
        <Text style={[styles.chipText, {color: on ? COLORS.accentText : textColor}]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.line}>
      <ClipIcon size={14} color={textColor} />
      <Text style={[styles.name, {color: textColor}, mode === 'off' && styles.off]} numberOfLines={1}>
        {targets.label}
      </Text>
      {targets.page !== null ? chip('page', `p. ${targets.page + 1}`) : null}
      {chip('file', 'no page')}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8},
  name: {flexShrink: 1, fontSize: FONT.small, marginLeft: 4, marginRight: 6, includeFontPadding: false},
  off: {opacity: 0.6},
  chip: {borderWidth: 1, borderRadius: RADII.pillMd, paddingHorizontal: 8, paddingVertical: QUICK_ADD_CHIP_PADDING, marginLeft: 4},
  chipOn: {backgroundColor: COLORS.accent},
  chipText: {fontSize: FONT.small, fontWeight: '600', includeFontPadding: false},
});
