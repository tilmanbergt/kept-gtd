/**
 * Settings → Contexts: from how much time on loops and counterparts show in
 * Given time (docs/dev/history/technical-design-time-and-place.md §10 C2) - a
 * context's own, or Everything's. One row per period, a few fixed steps, so no
 * keyboard is needed.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {MinMinutes} from '../../../domain/contexts';
import MiniTabs, {MiniTabDef} from '../../../ui/MiniTabs';
import {FONT} from '../../../ui/theme';
import {styles} from '../settingsStyles';

type Scope = keyof MinMinutes;

const STEPS: Record<Scope, number[]> = {week: [0, 30, 60, 120], month: [0, 60, 120, 240]};
const stepLabel = (minutes: number) => (minutes === 0 ? 'all' : minutes < 60 ? `${minutes} min` : `${minutes / 60} h`);
const tabsOf = (scope: Scope): MiniTabDef<string>[] => STEPS[scope].map(m => ({key: String(m), label: stepLabel(m)}));

interface Props {
  value: MinMinutes;
  onChange: (scope: Scope, minutes: number) => void;
  textColor: string;
  borderColor: string;
}

export default function GivenTimeThreshold({value, onChange, textColor, borderColor}: Props): React.JSX.Element {
  const row = (scope: Scope, label: string) => (
    <View style={local.row}>
      <Text style={[local.label, {color: textColor}]}>{label}</Text>
      <View style={local.tabs}>
        <MiniTabs tabs={tabsOf(scope)} activeKey={String(value[scope])} onChange={k => onChange(scope, Number(k))} textColor={textColor} borderColor={borderColor} />
      </View>
    </View>
  );
  return (
    <View>
      <Text style={[styles.label, {color: textColor}]}>Given time: loops and counterparts from</Text>
      {row('week', 'a week')}
      {row('month', 'a month')}
    </View>
  );
}

const local = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  label: {width: 80, fontSize: FONT.small},
  tabs: {flex: 1},
});
