/**
 * The header of a Project's or Area's page (docs/dev/history/technical-design-calmer-screens.md
 * §3.8): the name, its kind, a Project's Area (a tap opens it), the given time
 * this week and the abbreviation, read only. Under it the scope, only when
 * there is one; a tap on it opens ⚙ Settings, where it is edited.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import KindBadge from '../../ui/KindBadge';
import {FONT} from '../../ui/theme';

interface Props {
  kind: 'project' | 'area';
  name: string;
  abbrev: string | null;
  area: string | null;
  scope: string;
  /** "3 h"; '' shows nothing. */
  weekTime: string;
  onOpenArea?: (areaName: string) => void;
  onOpenSettings: () => void;
  textColor: string;
}

function ItemHeader({kind, name, abbrev, area, scope, weekTime, onOpenArea, onOpenSettings, textColor}: Props): React.JSX.Element {
  const scopeText = scope.trim();
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={[styles.name, {color: textColor}]} numberOfLines={1}>
          {name}
        </Text>
        <KindBadge label={kind === 'project' ? 'Project' : 'Area'} textColor={textColor} />
        {area ? (
          <Pressable onPress={onOpenArea ? () => onOpenArea(area) : undefined} disabled={!onOpenArea} hitSlop={8} accessibilityRole="link">
            <Text style={[styles.area, {color: textColor}]} numberOfLines={1}>
              · {area} ›
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.spacer} />
        {weekTime ? <Text style={[styles.time, {color: textColor}]}>{weekTime} this week</Text> : null}
        {abbrev ? <Text style={[styles.abbrev, {color: textColor}]}>#{abbrev}</Text> : null}
      </View>
      {scopeText ? (
        <Pressable onPress={onOpenSettings} hitSlop={4} accessibilityLabel="Scope, opens Settings">
          <Text style={[styles.scope, {color: textColor}]} numberOfLines={2}>
            {scopeText}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default React.memo(ItemHeader);

const styles = StyleSheet.create({
  root: {marginBottom: 8},
  row: {flexDirection: 'row', alignItems: 'center'},
  name: {fontSize: FONT.large, fontWeight: '700', flexShrink: 1},
  area: {fontSize: FONT.small, fontWeight: '600', marginLeft: 6},
  spacer: {flex: 1},
  time: {fontSize: FONT.small, opacity: 0.7, marginLeft: 8},
  abbrev: {fontSize: FONT.small, fontWeight: '600', marginLeft: 8},
  scope: {fontSize: FONT.small, opacity: 0.8, marginTop: 4},
});
