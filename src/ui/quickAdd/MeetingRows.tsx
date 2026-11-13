/**
 * The lasso capture panel's Meeting rows (ui/quickAdd/CaptureQuickAdd.tsx):
 * R2, the title and the date (the date field draws its own strip), and R3,
 * the time with the time strip of Quick Add's form (ui/quickAdd/form/WhenStrip.tsx,
 * docs/dev/history/technical-design-quickadd-redesign.md §3.2: lengths, 30′
 * shifts, the usual slot), hovering above the field. Quick Add's box has its
 * own form (ui/quickAdd/form/). Free height; mounted while another kind shows.
 */
import React from 'react';
import {usePerfRender} from '../../utils/perf';
import WritingStrip from '../writing/WritingStrip';
import {StyleSheet, TextInput, View} from 'react-native';
import DateInput from '../DateInput';
import MarkWrap from '../status/StatusMark';
import {useLayoutClass} from '../ScreenSize';
import {FONT} from '../theme';
import {rowStyles} from './styles';
import {MeetingDraftState} from './useMeetingDraft';
import {QuickAddCore} from './useQuickAddCore';
import WhenStrip from './form/WhenStrip';
import {formatTimeSpan, formatWeekdayShort} from '../../domain/dateFormat';

interface Props {
  core: QuickAddCore;
  meeting: MeetingDraftState;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export function MeetingInputRow({core, meeting, textColor, borderColor, placeholderColor}: Props) {
  usePerfRender('QuickAddRows:meeting');
  return (
    <View style={[rowStyles.row2, rowStyles.row2Free, core.displayType !== 'meeting' && rowStyles.hidden]}>
      <View style={rowStyles.row2Wrap}>
        <MarkWrap mark={core.fieldMark('title')} textColor={textColor} flex>
          <TextInput
            ref={meeting.inputRef}
            style={[rowStyles.input, rowStyles.inputFlex, {color: textColor, borderColor}]}
            value={meeting.fields.title}
            onChangeText={meeting.setTitle}
            onSelectionChange={e => meeting.onSelectionChange(e.nativeEvent.selection)}
            selection={meeting.selectionOverride ?? undefined}
            onFocus={() => {
              meeting.setInputFocused(true);
              meeting.titleHelp.onFocus();
            }}
            onBlur={() => meeting.setInputFocused(false)}
            placeholder="New meeting"
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
          />
        </MarkWrap>
        <MarkWrap mark={core.fieldMark('date')} textColor={textColor}>
          <DateInput
            value={meeting.fields.date}
            onChangeText={meeting.setDate}
            placeholder="YYYY-MM-DD"
            placeholderColor={placeholderColor}
            textColor={textColor}
            borderColor={borderColor}
          />
        </MarkWrap>
      </View>
      <WritingStrip
        visible={meeting.inputFocused}
        content={meeting.titleHelp.strip}
        actions={meeting.titleHelp.actions}
        clipboard={meeting.clipboard}
        placement="above-right"
        textColor={textColor}
        borderColor={borderColor}
      />
    </View>
  );
}

/** R3: the time field with its strip. */
export function MeetingMetaRows({core, meeting, textColor, borderColor, placeholderColor}: Props) {
  const narrow = useLayoutClass() === 'narrow';
  const usual = meeting.hints.usual;
  return (
    <View style={[rowStyles.row3, rowStyles.row3Free, core.displayType !== 'meeting' && rowStyles.hidden]}>
      <View style={styles.timeWrap}>
        <MarkWrap mark={core.fieldMark('time')} textColor={textColor}>
          <TextInput
            style={[rowStyles.input, styles.time, {color: textColor, borderColor}]}
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
        <WhenStrip
          visible={meeting.timeFocused}
          field="time"
          value={meeting.fields.time}
          content={meeting.timeHelp.strip}
          actions={meeting.timeHelp.actions}
          warning={meeting.hints.timeShort}
          suggestLabel={usual ? `usual ${formatWeekdayShort(usual.date)} ${formatTimeSpan(usual.time, usual.endTime)}` : null}
          onSuggest={usual ? () => meeting.applyUsual(usual) : undefined}
          onChange={meeting.writeTime}
          narrow={narrow}
          placement="above"
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** The time strip's positioning context. */
  timeWrap: {position: 'relative', flexDirection: 'row'},
  time: {
    fontSize: FONT.small,
    // The field also takes a range or a length - "15:00-16:30" must fit.
    width: 150,
    marginRight: 6,
  },
});
