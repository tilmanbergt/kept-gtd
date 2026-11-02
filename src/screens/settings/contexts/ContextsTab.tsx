/**
 * Settings → Contexts (docs/dev/history/technical-design-contexts-tags.md §2.4):
 * the Note setups pattern - the list on the left, the open context's
 * editor on the right.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {threadTypesOf} from '../../../domain/counterparts';
import {WAITING_FOR_TYPE} from '../../../domain/flowState';
import {loopKindsOf} from '../../../domain/loops';
import {GtdParaSettings} from '../../../domain/settings';
import {OWE_TYPE} from '../../../domain/threads';
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
  const setups = values.noteSetups;
  // wf and owe make counterparts but are no places: not offered as a type, read as plain tags.
  const kinds = useMemo(
    () => ({loopKinds: loopKindsOf(setups ?? []), threadTypes: threadTypesOf(setups ?? []).filter(t => t !== WAITING_FOR_TYPE && t !== OWE_TYPE)}),
    [setups],
  );
  return (
    <View style={styles.row}>
      <View style={[styles.column, styles.columnLeft]}>
        <ContextsList
          contexts={values.contexts ?? []}
          activeId={values.activeContextId ?? ''}
          openId={draft.draft?.id ?? null}
          onNew={draft.handleNew}
          onEdit={draft.handleEdit}
          onEditEverything={draft.handleEditEverything}
          everythingOpen={draft.everythingOpen}
          onActivate={draft.handleActivate}
          kinds={kinds}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        <ContextEditor draft={draft} kinds={kinds} textColor={textColor} borderColor={borderColor} placeholderColor={placeholderColor} />
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
