/**
 * Settings → Contexts, left column (docs/dev/history/technical-design-time-and-place.md
 * §3.3): "+ New context", the contexts with their one-line summary, and the
 * built-in Everything, which cannot be edited.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {ContextDef, contextSummary, EVERYTHING_LABEL} from '../../../domain/contexts';
import PagedSection from '../../../ui/PagedSection';
import {styles} from '../settingsStyles';
import {SETUP_ROW_HEIGHT, setupStyles} from '../noteSetups/noteSetupsStyles';

interface Props {
  contexts: readonly ContextDef[];
  activeId: string;
  openId: string | null;
  onNew: () => void;
  onEdit: (id: string) => void;
  textColor: string;
  borderColor: string;
}

export default function ContextsList({contexts, activeId, openId, onNew, onEdit, textColor, borderColor}: Props): React.JSX.Element {
  return (
    <View style={setupStyles.page}>
      <Pressable onPress={onNew} hitSlop={8} style={styles.addDefRow}>
        <Text style={[styles.addDefRowText, {color: textColor}]}>+ New context</Text>
      </Pressable>
      <View style={[setupStyles.setupRow, setupStyles.defaultRow, {borderColor}]}>
        <View style={setupStyles.setupRowMain}>
          <Text style={[setupStyles.setupRowName, {color: textColor}]} numberOfLines={1}>
            {EVERYTHING_LABEL}
            {activeId === '' ? '  ●' : ''}
          </Text>
          <Text style={[setupStyles.setupRowMeta, {color: textColor}]} numberOfLines={1}>
            Built in: shows all your projects, areas and todos
          </Text>
        </View>
      </View>
      <View style={setupStyles.listBody}>
        <PagedSection<ContextDef>
          header="Contexts"
          rows={[...contexts]}
          rowHeight={() => SETUP_ROW_HEIGHT}
          resetKey={contexts.length}
          emptyHint="None yet. A context - Work, Home, Café - shows only what fits there; choose it from the chip in the tab bar."
          renderRow={c => (
            <Pressable key={c.id} onPress={() => onEdit(c.id)} hitSlop={4} style={[setupStyles.setupRow, {borderColor}, openId === c.id && setupStyles.defaultRow]}>
              <View style={setupStyles.setupRowMain}>
                <Text style={[setupStyles.setupRowName, {color: textColor}]} numberOfLines={1}>
                  {c.name || 'Unnamed'}
                  {activeId === c.id ? '  ●' : ''}
                </Text>
                <Text style={[setupStyles.setupRowMeta, {color: textColor}]} numberOfLines={1}>
                  {contextSummary(c)}
                </Text>
              </View>
            </Pressable>
          )}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
    </View>
  );
}
