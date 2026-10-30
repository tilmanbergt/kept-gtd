/**
 * The two This-file rows at the top of the Files pane while a file is being
 * linked (requirement L3; docs/dev/history/technical-design-easy-start.md §6.2):
 * "This file · p. 12" links the page Kept was opened on, "This file" links the
 * file without a page (it opens where it was last left). A tap picks like a
 * file tap. No rows when the launch file is unknown.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ThisFileTargets} from '../../domain/linkTargets';
import {ClipIcon} from '../icons';
import {FONT} from '../theme';
import {useThisFile} from '../useThisFile';

/** One row: the same height as a one-line file entry (FileBrowserPane's FILE_ENTRY_CHROME_PX + one line). */
export const THIS_FILE_ROW_PX = 42;

/** The rows' labels, also what Quick Add's line names. */
export function thisFileRowLabels(targets: ThisFileTargets): {withPage: string | null; withoutPage: string} {
  return {withPage: targets.page === null ? null : `This file · p. ${targets.page + 1}`, withoutPage: 'This file'};
}

interface Props {
  pick: (absolutePath: string) => void;
  textColor: string;
  borderColor: string;
}

export default function ThisFileRows({pick, textColor, borderColor}: Props): React.JSX.Element | null {
  const targets = useThisFile(true);
  if (!targets) return null;
  const labels = thisFileRowLabels(targets);
  const row = (label: string, linked: string) => (
    <Pressable key={label} onPress={() => pick(linked)} style={[styles.row, {borderColor}]}>
      <ClipIcon size={16} color={textColor} />
      <Text style={[styles.label, {color: textColor}]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
        {targets.label}
      </Text>
    </Pressable>
  );
  return (
    <View>
      {targets.withPage && labels.withPage ? row(labels.withPage, targets.withPage) : null}
      {row(labels.withoutPage, targets.withoutPage)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {height: THIS_FILE_ROW_PX, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1},
  label: {fontSize: FONT.medium, fontWeight: '700', marginLeft: 8, includeFontPadding: false},
  name: {flex: 1, fontSize: FONT.medium, marginLeft: 12, includeFontPadding: false},
});
