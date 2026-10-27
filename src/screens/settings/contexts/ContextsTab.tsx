/**
 * Settings → Contexts (docs/dev/history/technical-design-time-and-place.md §3.3,
 * D20): the Note setups pattern - the list on the left, the open context's
 * editor on the right.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {GtdParaSettings} from '../../../domain/settings';
import {SPACING} from '../../../ui/theme';
import ContextEditor from './ContextEditor';
import ContextsList from './ContextsList';
import {ContextsDraft} from './useContextsDraft';

export default function ContextsTab(props: {
  draft: ContextsDraft;
  values: GtdParaSettings;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}): React.JSX.Element {
  const {draft, values, textColor, borderColor, placeholderColor} = props;
  return (
    <View style={styles.row}>
      <View style={[styles.column, styles.columnLeft]}>
        <ContextsList
          contexts={values.contexts ?? []}
          activeId={values.activeContextId ?? ''}
          openId={draft.draft?.id ?? null}
          onNew={draft.handleNew}
          onEdit={draft.handleEdit}
          onActivate={draft.handleActivate}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        <ContextEditor draft={draft} textColor={textColor} borderColor={borderColor} placeholderColor={placeholderColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flex: 1},
  column: {flex: 1},
  columnLeft: {marginRight: SPACING.base},
  divider: {width: 1, marginRight: SPACING.base},
});
