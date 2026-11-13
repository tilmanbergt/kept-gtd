/**
 * Count tabs over a todo list (docs/dev/history/technical-design-calmer-screens.md
 * §3.5) on top of ui/MiniTabs.tsx: `Next 11 · Waiting 5 🔔1 · Inbox 9 · Done 2`.
 * The bell (ui/icons.tsx BellIcon) with its number counts what is due today
 * or earlier; no colour. A tab that is not `fixed` shows only while its
 * count is above 0; when the chosen tab is not shown, the first one is.
 * `accessory` sits right-aligned in the same row.
 *
 * Below 800 dp, when the words would not fit the row (an estimate at
 * estimatorWidth), the tabs not chosen show their count only.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BellIcon} from './icons';
import MiniTabs, {MiniTabDef} from './MiniTabs';
import {estimatorWidth, useLayoutClass} from './ScreenSize';
import {FONT} from './theme';

export interface CountTabDef<K extends string> {
  key: K;
  label: string;
  count: number;
  /** How many are due; the bell shows while above 0. */
  bell?: number;
  /** Shown also with a count of 0. */
  fixed: boolean;
}

interface Props<K extends string> {
  tabs: CountTabDef<K>[];
  activeKey: K;
  onChange: (key: K) => void;
  accessory?: React.ReactNode;
  textColor: string;
  borderColor: string;
}

/** The tabs shown and the one that is active (the first shown when `activeKey` isn't). */
export function shownCountTabs<K extends string>(tabs: CountTabDef<K>[], activeKey: K): {tabs: CountTabDef<K>[]; activeKey: K} {
  const shown = tabs.filter(t => t.fixed || t.count > 0);
  const active = shown.some(t => t.key === activeKey) ? activeKey : shown[0]?.key ?? activeKey;
  return {tabs: shown, activeKey: active};
}

// About 9 dp per character at FONT.medium, plus each tab's margin and padding (ui/MiniTabs.tsx).
const CHAR_DP = 9;
const TAB_CHROME_DP = 28;

export default function CountTabs<K extends string>({tabs, activeKey, onChange, accessory, textColor, borderColor}: Props<K>): React.JSX.Element {
  const narrow = useLayoutClass() === 'narrow';
  const shown = shownCountTabs(tabs, activeKey);
  const fullWidth = shown.tabs.reduce((sum, t) => sum + (t.label.length + 4 + (t.bell ? 3 : 0)) * CHAR_DP + TAB_CHROME_DP, 0);
  const short = narrow && fullWidth > estimatorWidth();
  const defs: MiniTabDef<K>[] = shown.tabs.map(t => ({
    key: t.key,
    label: short && t.key !== shown.activeKey ? String(t.count) : `${t.label} ${t.count}`,
    adornment: t.bell ? (
      <View style={styles.bell} accessibilityLabel={`${t.bell} due`}>
        <BellIcon size={14} color={textColor} />
        <Text style={[styles.bellText, {color: textColor}]}>{t.bell}</Text>
      </View>
    ) : undefined,
  }));
  return <MiniTabs tabs={defs} activeKey={shown.activeKey} onChange={onChange} trailing={accessory} textColor={textColor} borderColor={borderColor} />;
}

const styles = StyleSheet.create({
  bell: {flexDirection: 'row', alignItems: 'center', marginLeft: 6},
  bellText: {fontSize: FONT.small, fontWeight: '700', marginLeft: 2},
});
