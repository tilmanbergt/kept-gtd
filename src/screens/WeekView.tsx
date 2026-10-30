/**
 * Week view (docs/dev/history/technical-design-weekly-view.md) - the weekly counterpart
 * of screens/DailyView.tsx. This file is the header + week navigation only;
 * everything below the header lives in screens/WeekPlanner.tsx
 * (docs/dev/history/technical-design-meeting-lists.md §2.9/§4.2: the chip grid
 * ui/WeekGrid.tsx, and the shared day panel ui/DayMeetingsPanel.tsx on the
 * right, like the Month view), so the Review's week-ahead step can show the
 * very same screen.
 *
 * Week navigation (§8): `weekOffset` is plain, unpersisted `useState(0)` -
 * every reopen of this tab starts back on the current week, the same
 * "sessions held lightly" posture screens/DailyView.tsx's focus-mode-only
 * state uses. `‹`/`›` step it by ±1 (closing an open day panel first), "Now" goes back. The
 * week ("Week 44 · 26") and its arrows sit at the right end of the Schedule | Google tab row
 * (ui/PeriodNav.tsx), not in a header line of their own
 * (docs/dev/history/technical-design-launch-ready.md L6b).
 *
 * Load/meeting/focus/goal actions live in screens/usePlanningScreen.ts,
 * shared with the Month view (docs/dev/history/technical-design-monthly-view.md
 * §5.10); the focus panel is ui/PeriodFocusPanel.tsx (scope "weekly"), the
 * history panel ui/PeriodGoalsHistoryPanel.tsx, and the "can this week be
 * edited" rule domain/period.ts's canEditPeriod (the current week, plus next
 * week from Friday to Sunday, so next week's priorities can be set late in
 * the current one).
 */
import React, {useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {shiftPeriod, shortWeekTitle} from '../domain/period';
import {isoWeekOf} from '../domain/weekDate';
import {FolderEntry} from '../supernote/fileSystem';
import {common} from '../ui/commonStyles';
import LoadErrorNotice from '../ui/LoadErrorNotice';
import PeriodNav from '../ui/PeriodNav';
import WeekPlanner from './WeekPlanner';
import {usePlanningScreen} from './usePlanningScreen';
import {usePerfRender} from '../utils/perf';

interface Props {
  onOpenItem: (kind: 'project' | 'area', entry: FolderEntry) => void;
  /** Switches to the Inbox tab - an Inbox-sourced meeting's source tap jumps here (there's no Project/Area to open). */
  onOpenInbox?: () => void;
  /** Switches to Settings' Calendar sub-tab - the Google mini-tab's empty state. */
  onOpenCalendarSettings?: () => void;
}

export default function WeekView({
  onOpenItem,
  onOpenInbox,
  onOpenCalendarSettings,
}: Props): React.JSX.Element {
  usePerfRender('WeekView');
  const textColor = '#000000';
  const borderColor = '#dddddd';
  const placeholderColor = '#999999';

  const planning = usePlanningScreen({logTag: 'WeekView'});
  const {loading, error, load} = planning;

  // Plain, unpersisted - every fresh mount starts on the current week.
  const [weekOffset, setWeekOffset] = useState(0);
  const {year, week} = isoWeekOf(shiftPeriod('weekly', new Date(), weekOffset));
  const changeWeek = (delta: number) => planning.closeDayPanel(() => setWeekOffset(o => o + delta));

  return (
    <View style={common.container}>
      {loading && <ActivityIndicator style={common.spacer} />}

      {!loading && error && <LoadErrorNotice error={error} onRetry={() => load(true)} textColor={textColor} />}

      {!loading && !error && (
        <View style={common.content}>
          <WeekPlanner
            planning={planning}
            weekOffset={weekOffset}
            onOpenItem={onOpenItem}
            onOpenInbox={onOpenInbox}
            onOpenCalendarSettings={onOpenCalendarSettings}
            textColor={textColor}
            borderColor={borderColor}
            placeholderColor={placeholderColor}
            leftTabsTrailing={
              <PeriodNav
                label={shortWeekTitle(week, year)}
                onPrev={() => changeWeek(-1)}
                onNext={() => changeWeek(1)}
                onNow={weekOffset !== 0 ? () => planning.closeDayPanel(() => setWeekOffset(0)) : undefined}
                textColor={textColor}
              />
            }
          />
        </View>
      )}
    </View>
  );
}
