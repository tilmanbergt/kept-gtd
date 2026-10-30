/**
 * The Month view's left column (docs/dev/history/technical-design-monthly-view.md §5.8):
 * one fixed row per calendar day, every row an equal `flex:1` share of the
 * bounded box it's given (flex-weight stacking, docs/dev/technical-design-flex-
 * weight-stacking.md) - on the A5X that's ~50px per row for 31 days, so no
 * paging is needed. Each row: "Th 01", the day's highlights joined with
 * " // " as far as they fit on one line, then "+N" for the rest, an "F" (one
 * focus block) or "F2" (two or more: "F<n>") mark, and - on
 * Mondays - a thicker top rule plus the ISO week number. Weekends are
 * shaded; the selected day is inverted. Tapping a row selects that day (the
 * screen then shows its day panel).
 *
 * How many labels fit is predicted with domain/textLineEstimator.ts against the
 * row's measured width (same estimator every multi-line row in the app
 * uses), so a crowded day degrades to "+N" instead of being clipped
 * mid-word.
 *
 * Where 31 rows would be lower than 24 dp (a Nomad turned; decided for 31 days, so every month
 * of a screen behaves the same) the column shows the month in two halves, 1-15 and 16-end, with "‹ ›" in a line on top,
 * opening on the half that holds today (domain/screenLayout.ts monthNeedsHalves,
 * docs/dev/history/technical-design-launch-ready.md L6b).
 */
import React, {useEffect, useState} from 'react';
import {LayoutChangeEvent, Pressable, StyleSheet, Text, View} from 'react-native';
import {withSpanArrows} from '../domain/meetingSpan';
import {MonthDay, MonthDayEntry} from '../storage/monthlyAggregate';
import {activeLineEstimator} from '../domain/textLineEstimator';
import {MONTH_FIRST_HALF_DAYS, monthHalfOf, monthNeedsHalves} from '../domain/screenLayout';
import {FONT} from './theme';

const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const SEPARATOR = '  //  ';
/** Day label (64) + week-number column (40) + "+N" chip allowance (44) + paddings/gaps. */
const ROW_CHROME_PX = 64 + 40 + 44 + 34 + 40;

interface Props {
  days: MonthDay[];
  selectedDate: string | null;
  todayDate: string;
  onSelectDay: (date: string) => void;
  textColor: string;
  borderColor: string;
}

/** A highlight's label with its multi-day arrows - domain/meetingSpan.ts's withSpanArrows, the same arrows Daily/Week rows use. */
function displayLabel(h: MonthDayEntry): string {
  return withSpanArrows(h.label, h.part);
}

/** How many of `labels` fit on one line at `widthPx` (at least 1 when there are any, so a row never shows only "+N"). */
function fitCount(labels: string[], widthPx: number): number {
  if (labels.length === 0 || widthPx <= 0) return labels.length;
  let n = 0;
  for (let i = 1; i <= labels.length; i++) {
    const text = labels.slice(0, i).join(SEPARATOR);
    if (activeLineEstimator.estimateLines(text, widthPx, FONT.medium) > 1) break;
    n = i;
  }
  return Math.max(1, n);
}

function inverse(color: string): string {
  const c = color.toLowerCase();
  return c === '#000' || c === '#000000' || c === 'black' ? '#ffffff' : '#000000';
}

export default function MonthDaysColumn({days, selectedDate, todayDate, onSelectDay, textColor, borderColor}: Props): React.JSX.Element {
  const [size, setSize] = useState({width: 0, height: 0});
  const onLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setSize(prev => (prev.width === width && prev.height === height ? prev : {width, height}));
  };
  const labelWidth = Math.max(0, size.width - ROW_CHROME_PX);

  // Halves: the one holding today when the month is the current one, else the first.
  const monthKey = days[0]?.date.slice(0, 7) ?? '';
  const defaultHalf = todayDate.slice(0, 7) === monthKey ? monthHalfOf(todayDate) : 0;
  const [half, setHalf] = useState<0 | 1>(defaultHalf);
  useEffect(() => setHalf(defaultHalf), [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const halves = monthNeedsHalves(size.height);
  const shownDays = !halves ? days : half === 0 ? days.slice(0, MONTH_FIRST_HALF_DAYS) : days.slice(MONTH_FIRST_HALF_DAYS);
  const lastDay = days.length > 0 ? Number(days[days.length - 1].date.slice(8)) : 0;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {halves && (
        <View style={[styles.halfRow, {borderColor}]}>
          <Pressable onPress={() => setHalf(0)} disabled={half === 0} hitSlop={8} style={styles.halfArrow} accessibilityLabel="First half">
            <Text style={[styles.halfArrowText, {color: textColor}, half === 0 && styles.halfOff]}>‹</Text>
          </Pressable>
          <Text style={[styles.halfLabel, {color: textColor}]}>{half === 0 ? `1-${MONTH_FIRST_HALF_DAYS}` : `${MONTH_FIRST_HALF_DAYS + 1}-${lastDay}`}</Text>
          <Pressable onPress={() => setHalf(1)} disabled={half === 1} hitSlop={8} style={styles.halfArrow} accessibilityLabel="Second half">
            <Text style={[styles.halfArrowText, {color: textColor}, half === 1 && styles.halfOff]}>›</Text>
          </Pressable>
        </View>
      )}
      {shownDays.map(day => {
        const selected = day.date === selectedDate;
        const isToday = day.date === todayDate;
        const weekend = day.weekday >= 5;
        const fg = selected ? inverse(textColor) : textColor;
        const labels = day.highlights.map(displayLabel);
        const shown = fitCount(labels, labelWidth);
        const more = labels.length - shown;
        const dayNum = day.date.slice(8);
        return (
          <Pressable
            key={day.date}
            onPress={() => onSelectDay(day.date)}
            style={[
              styles.row,
              {borderColor},
              weekend && styles.weekend,
              day.weekday === 0 && [styles.weekStart, {borderTopColor: textColor}],
              selected && {backgroundColor: textColor},
            ]}>
            <Text style={[styles.dayLabel, {color: fg}, weekend && !selected && styles.weekendLabel]}>
              {WEEKDAY_SHORT[day.weekday]} {dayNum}
              {isToday ? ' •' : ''}
            </Text>
            <Text style={[styles.highlights, {color: fg}]} numberOfLines={1}>
              {labels.slice(0, shown).join(SEPARATOR)}
            </Text>
            {more > 0 && (
              <View style={[styles.moreChip, {borderColor: fg}]}>
                <Text style={[styles.moreText, {color: fg}]}>+{more}</Text>
              </View>
            )}
            <Text style={[styles.focusMark, {color: fg}]}>{day.focusBlocks === 0 ? '' : day.focusBlocks === 1 ? 'F' : `F${day.focusBlocks}`}</Text>
            <Text style={[styles.weekNo, {color: fg}]}>{day.isoWeek != null ? `W${day.isoWeek}` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  halfRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', height: 28, borderBottomWidth: 1},
  halfLabel: {fontSize: FONT.small, fontWeight: '700'},
  halfArrow: {paddingHorizontal: 10},
  halfArrowText: {fontSize: FONT.large, fontWeight: '700', includeFontPadding: false},
  halfOff: {opacity: 0.25},
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  weekend: {
    backgroundColor: '#efefea',
  },
  weekStart: {
    borderTopWidth: 3,
  },
  dayLabel: {
    width: 64,
    fontSize: FONT.medium,
    fontWeight: '700',
    includeFontPadding: false,
  },
  weekendLabel: {
    opacity: 0.7,
  },
  focusMark: {
    width: 34,
    fontSize: FONT.small,
    fontWeight: '700',
    textAlign: 'right',
  },
  highlights: {
    flex: 1,
    fontSize: FONT.medium,
    includeFontPadding: false,
  },
  moreChip: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  moreText: {
    fontSize: FONT.small,
    fontWeight: '600',
  },
  weekNo: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    opacity: 0.6,
  },
});
