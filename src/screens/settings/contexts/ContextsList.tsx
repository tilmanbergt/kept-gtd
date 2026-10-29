/**
 * Settings → Contexts, left column (docs/dev/history/technical-design-time-and-place.md
 * §3.3): "+ New context", the built-in Everything (not editable) and the
 * contexts with their one-line summary and how many `#next` todos they show.
 * Each row starts with a radio: a tap there makes it the active context (the
 * tab bar's chip opens this tab); a tap on the rest of a row opens it in the
 * editor (Everything with only its Given time threshold).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ContextDef, contextSummary, EVERYTHING_LABEL, nextCountOf} from '../../../domain/contexts';
import {todayIso} from '../../../domain/meetingTime';
import PagedSection from '../../../ui/PagedSection';
import {FONT} from '../../../ui/theme';
import {useCachedItems} from '../../../ui/useCachedItems';
import {styles} from '../settingsStyles';
import {SETUP_ROW_HEIGHT, setupStyles} from '../noteSetups/noteSetupsStyles';

interface Props {
  contexts: readonly ContextDef[];
  activeId: string;
  openId: string | null;
  onNew: () => void;
  onEdit: (id: string) => void;
  onEditEverything: () => void;
  everythingOpen: boolean;
  onActivate: (id: string) => void;
  textColor: string;
  borderColor: string;
}

export default function ContextsList({contexts, activeId, openId, onNew, onEdit, onEditEverything, everythingOpen, onActivate, textColor, borderColor}: Props): React.JSX.Element {
  const items = useCachedItems();
  const today = todayIso();
  const radio = (id: string, name: string) => {
    const on = id === activeId;
    return (
      <Pressable
        onPress={() => onActivate(id)}
        hitSlop={8}
        style={local.radio}
        accessibilityRole="radio"
        accessibilityLabel={`Use ${name}`}
        accessibilityState={{checked: on}}>
        <Text style={[local.radioText, {color: textColor}]}>{on ? '●' : '○'}</Text>
      </Pressable>
    );
  };
  const meta = (summary: string, ctx: ContextDef | null) => `${nextCountOf(ctx, items, today)} next · ${summary}`;

  return (
    <View style={setupStyles.page}>
      <Pressable onPress={onNew} hitSlop={8} style={styles.addDefRow}>
        <Text style={[styles.addDefRowText, {color: textColor}]}>+ New context</Text>
      </Pressable>
      <View style={[setupStyles.setupRow, local.row, {borderColor}, everythingOpen && setupStyles.defaultRow]}>
        {radio('', EVERYTHING_LABEL)}
        <Pressable onPress={onEditEverything} hitSlop={4} style={setupStyles.setupRowMain}>
          <Text style={[setupStyles.setupRowName, {color: textColor}]} numberOfLines={1}>
            {EVERYTHING_LABEL}
          </Text>
          <Text style={[setupStyles.setupRowMeta, {color: textColor}]} numberOfLines={1}>
            {meta('built in: all your projects, areas and todos', null)}
          </Text>
        </Pressable>
      </View>
      <View style={setupStyles.listBody}>
        <PagedSection<ContextDef>
          header="Contexts"
          rows={[...contexts]}
          rowHeight={() => SETUP_ROW_HEIGHT}
          resetKey={contexts.length}
          emptyHint="None yet. A context - Work, Home, Café - shows only what fits there. Tap ○ to use it; the chip in the tab bar brings you here."
          renderRow={c => (
            <View key={c.id} style={[setupStyles.setupRow, local.row, {borderColor}, openId === c.id && setupStyles.defaultRow]}>
              {radio(c.id, c.name || 'Unnamed')}
              <Pressable onPress={() => onEdit(c.id)} hitSlop={4} style={setupStyles.setupRowMain}>
                <Text style={[setupStyles.setupRowName, {color: textColor}]} numberOfLines={1}>
                  {c.name || 'Unnamed'}
                </Text>
                <Text style={[setupStyles.setupRowMeta, {color: textColor}]} numberOfLines={1}>
                  {meta(contextSummary(c), c)}
                </Text>
              </Pressable>
            </View>
          )}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  radio: {width: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch'},
  radioText: {fontSize: FONT.large},
});
