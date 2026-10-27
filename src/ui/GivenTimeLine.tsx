/**
 * The Project/Area page's Given time line (docs/dev/history/technical-design-time-and-place.md
 * §3.4, D30): "Given time · this week 3 h · this month 11 h" - the meetings
 * and focus blocks scheduled in the item (an Area with its assigned
 * Projects), from the cache. The page itself is never filtered by a context.
 */
import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {hoursText, scheduledMinutes} from '../domain/givenTime';
import {periodOf} from '../domain/period';
import {CachedItem} from '../storage/dataCache';
import {FONT} from './theme';
import {useCachedItems} from './useCachedItems';

/** The meetings counted for `item`: its own, and an Area's Projects'. */
export function itemMeetings(item: Pick<CachedItem, 'kind' | 'name' | 'path' | 'meetings'>, items: readonly CachedItem[]) {
  if (item.kind !== 'area') return item.meetings;
  return [...item.meetings, ...items.filter(i => i.kind === 'project' && i.area === item.name).flatMap(i => i.meetings)];
}

export default function GivenTimeLine({path, textColor}: {path: string; textColor: string}): React.JSX.Element | null {
  const items = useCachedItems();
  const item = items.find(i => i.path === path);
  if (!item) return null;
  const meetings = itemMeetings(item, items);
  const now = new Date();
  const week = scheduledMinutes(meetings, periodOf('weekly', now));
  const month = scheduledMinutes(meetings, periodOf('monthly', now));
  return (
    <Text style={[styles.line, {color: textColor}]} numberOfLines={1}>
      Given time · this week {hoursText(week)} · this month {hoursText(month)}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {fontSize: FONT.small, marginBottom: 8},
});
