/**
 * The Quick Add box (docs/dev/history/technical-design-item-card.md §4): a
 * bordered card of four rows at fixed heights -
 *   R1 tabs and the main button · R2 input · R3 metadata · R4 more tags,
 *   the provenance line, or the edit form's commands -
 * the same 174 dp whatever it shows, so the lists below it never move when
 * the user switches tabs, starts an edit or pages the tags. Every row sets
 * its own height (ui/quickAdd/styles.ts); each slot holds every tab's
 * version of its rows at once, the inactive ones hidden with
 * `display: none`, never unmounted.
 *
 * `form` (docs/dev/history/technical-design-quickadd-redesign.md §3.1): Quick
 * Add's form - one two-line field over rows 1-2 (72 dp), row 3 and row 4 (34
 * dp each), the same 174 dp. Collapsed, R1 holds the kind buttons and the form
 * stays mounted, hidden.
 *
 * `free`: the lasso capture panel's taller layout (multi-line text, Split
 * lines, chips below) - rows grow with their content, no fixed height.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

/**
 * Row heights and the gap below each row (none below R4), in dp. R3 and R4
 * hold chips: on the device a chip label is about 20 dp high, so a chip with
 * QUICK_ADD_CHIP_PADDING above and below and its border is about 30 dp.
 */
export const QUICK_ADD_ROWS = {tabs: 30, input: 36, meta: 34, extra: 34, gap: 6} as const;

/** Vertical padding of the chips in the box (flow chips, tag chips). */
export const QUICK_ADD_CHIP_PADDING = 4;

const PADDING = 10;
const BORDER = 1;

/** The box's height in every state. */
export const QUICK_ADD_HEIGHT =
  2 * (BORDER + PADDING) + QUICK_ADD_ROWS.tabs + QUICK_ADD_ROWS.input + QUICK_ADD_ROWS.meta + QUICK_ADD_ROWS.extra + 3 * QUICK_ADD_ROWS.gap;

/** R1 in the capture panel's free layout (tabs only). */
const FREE_TABS_HEIGHT = 22;

interface Props {
  /** R1: tabs, and the main button on the right. */
  row1: React.ReactNode;
  /** R2: every tab's input row (the capture panel). */
  row2?: React.ReactNode;
  /** R3 and R4: every tab's metadata row and fourth row (the capture panel). */
  rows34?: React.ReactNode;
  /** Quick Add's form: the field slot (rows 1-2), row 3 and row 4, in place of R1-R4. */
  form?: {field: React.ReactNode; row3: React.ReactNode; row4: React.ReactNode};
  /** The capture panel's tags, "File to" and extras. */
  below?: React.ReactNode;
  /** The item card (ui/itemCard/): shown in place of the rows, which stay mounted, hidden. */
  card?: React.ReactNode;
  /**
   * The collapsed box (docs/dev/history/technical-design-calmer-screens.md §3.2):
   * R1 only (the kind buttons, which may wrap onto a second row - R1 has no
   * fixed height then); R2-R4 stay mounted, hidden, so drafts survive, and the
   * box keeps its height.
   */
  collapsed?: boolean;
  free?: boolean;
  borderColor: string;
}

export default function QuickAddFrame({row1, row2, rows34, form, below, card, collapsed = false, free = false, borderColor}: Props): React.JSX.Element {
  if (form) {
    return (
      <View style={[styles.card, styles.fixed, {borderColor}]} testID="quick-add-frame">
        <View style={card ? styles.hidden : undefined} testID="quick-add-rows">
          {collapsed ? <View style={[styles.row1, styles.row1Collapsed]}>{row1}</View> : null}
          <View style={collapsed ? styles.hidden : undefined} testID="quick-add-rows-below" collapsable={false}>
            {form.field}
            {form.row3}
            {form.row4}
          </View>
        </View>
        {card}
      </View>
    );
  }
  return (
    <View style={[styles.card, !free && styles.fixed, {borderColor}]} testID="quick-add-frame">
      <View style={card ? styles.hidden : undefined} testID="quick-add-rows">
        <View style={[styles.row1, free ? styles.row1Free : collapsed ? styles.row1Collapsed : styles.row1Fixed]}>{row1}</View>
        <View style={collapsed ? styles.hidden : undefined} testID="quick-add-rows-below">
          {row2}
          {rows34}
          {below}
        </View>
      </View>
      {card}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: BORDER,
    borderRadius: 6,
    padding: PADDING,
  },
  fixed: {
    height: QUICK_ADD_HEIGHT,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: QUICK_ADD_ROWS.gap,
  },
  row1Fixed: {
    height: QUICK_ADD_ROWS.tabs,
  },
  row1Collapsed: {
    alignItems: 'flex-start',
  },
  row1Free: {
    minHeight: FREE_TABS_HEIGHT,
  },
  hidden: {
    display: 'none',
  },
});
