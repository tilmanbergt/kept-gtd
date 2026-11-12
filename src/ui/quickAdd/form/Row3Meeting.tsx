/**
 * Row 3 of the meeting form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.3): the date (today to start with), the time (150 dp below 800 dp, else
 * 190), a plain warning sign while the meeting is past or overlaps another (the
 * strips say which), and F for a focus block on the right. M is on the card.
 */
import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import DateInput from '../../DateInput';
import HighlightMark from '../../HighlightMark';
import {WarningIcon} from '../../icons';
import MarkWrap from '../../status/StatusMark';
import {useLayoutClass} from '../../ScreenSize';
import {FONT} from '../../theme';
import {rowStyles} from '../styles';
import {MeetingDraftState} from '../useMeetingDraft';
import {QuickAddCore} from '../useQuickAddCore';

interface Props {
  core: QuickAddCore;
  meeting: MeetingDraftState;
  hidden: boolean;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function Row3Meeting({core, meeting, hidden, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const narrow = useLayoutClass() === 'narrow';
  const warning = !!(meeting.hints.dateShort || meeting.hints.timeShort);
  return (
    <View style={[rowStyles.row3, hidden && rowStyles.hidden]}>
      <View style={styles.left}>
        <MarkWrap mark={core.fieldMark('date')} textColor={textColor}>
          <DateInput
            onFocusChange={focused => {
              meeting.setDateFocused(focused);
              if (focused) meeting.dateHelp.onFocus();
            }}
            value={meeting.fields.date}
            onChangeText={meeting.setDate}
            placeholder="YYYY-MM-DD"
            placeholderColor={placeholderColor}
            textColor={textColor}
            borderColor={borderColor}
            width={narrow ? 120 : 140}
          />
        </MarkWrap>
        <MarkWrap mark={core.fieldMark('time')} textColor={textColor}>
          <TextInput
            style={[rowStyles.input, styles.time, narrow ? styles.timeNarrow : styles.timeWide, {color: textColor, borderColor}]}
            value={meeting.fields.time}
            onChangeText={meeting.setTime}
            onFocus={() => {
              meeting.setTimeFocused(true);
              meeting.timeHelp.onFocus();
            }}
            onBlur={() => meeting.setTimeFocused(false)}
            placeholder="15 · 15-16.30 · 2d"
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
          />
        </MarkWrap>
        {warning ? (
          <View style={styles.sign} accessibilityRole="image" accessibilityLabel="Warning">
            <WarningIcon color={textColor} />
          </View>
        ) : null}
      </View>
      <HighlightMark on={meeting.fields.focusBlock} letter="F" variant="toggle" onPress={meeting.toggleFocusBlock} disabled={core.pending} textColor={textColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  left: {flexDirection: 'row', alignItems: 'center', flexShrink: 1},
  time: {fontSize: FONT.small, marginLeft: 6, paddingVertical: 4},
  timeWide: {width: 190},
  timeNarrow: {width: 150},
  sign: {marginLeft: 6},
});
