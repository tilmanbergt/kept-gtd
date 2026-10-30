/**
 * One column of a two-column Settings tab (Data, Features, Advanced) that scrolls where it is
 * taller than the screen - a turned device, a Nomad (docs/dev/history/technical-design-launch-ready.md
 * L6b). On the A5 X upright every column fits and nothing scrolls. Settings is opened rarely, so a
 * scrolling column is fine here; lists elsewhere page instead.
 */
import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {SPACING} from '../../ui/theme';

export default function ScrollColumn({left = false, children}: {left?: boolean; children: React.ReactNode}): React.JSX.Element {
  return (
    <ScrollView style={[styles.column, left && styles.columnLeft]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  column: {flex: 1},
  columnLeft: {marginRight: SPACING.base},
  content: {paddingBottom: SPACING.base},
});
