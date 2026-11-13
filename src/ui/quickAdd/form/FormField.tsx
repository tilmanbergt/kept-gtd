/**
 * Rows 1-2 of Quick Add's form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.1): one text field over two lines - the todo's text, the meeting's
 * title, the agreement's words or the note's title. A title is one line of
 * its file: the draft turns a newline into a space (domain/writing/insertion.ts
 * `oneLine`), and Enter never adds. The wrapper is a real Android view
 * (`collapsable={false}`, ui/quickAdd/layoutLog.ts) and the positioning
 * context of every strip (`strips`, ui/quickAdd/form/StripHost.tsx), which
 * are drawn after the field, on top of it without a zIndex.
 */
import React, {RefObject} from 'react';
import {LayoutChangeEvent, StyleSheet, TextInput, View} from 'react-native';
import {Selection} from '../../../domain/clipboardText';
import MarkWrap from '../../status/StatusMark';
import {log} from '../../../utils/log';
import {FONT} from '../../theme';
import {QUICK_ADD_ROWS} from '../QuickAddFrame';

/** Rows 1 and 2 with the gap between them. */
export const FORM_FIELD_HEIGHT = QUICK_ADD_ROWS.tabs + QUICK_ADD_ROWS.gap + QUICK_ADD_ROWS.input;

interface Props {
  inputRef?: RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  onSelectionChange: (selection: Selection) => void;
  selection?: Selection;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  /** The ⚠ of an error about this field. */
  mark: 'warning' | null;
  editable?: boolean;
  hidden: boolean;
  /** The strips (StripHost), drawn over and above the field. */
  strips?: React.ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
  /**
   * For the log (docs/dev/history/technical-design-quickadd-redesign.md §11 G4): which field
   * (`kind=task editing=true`) - a touch-down and every focus change are logged, so a field that
   * takes no input shows whether touches arrive at all.
   */
  logKey: string;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function FormField(props: Props): React.JSX.Element {
  const {inputRef, value, onChangeText, onSelectionChange, selection, onFocus, onBlur, placeholder, mark, editable = true, hidden, strips, onLayout, logKey} = props;
  const {textColor, borderColor, placeholderColor} = props;
  return (
    <View
      style={[styles.slot, hidden && styles.hidden]}
      collapsable={false}
      onLayout={onLayout}
      onTouchStart={() => log(`QuickAdd: touch field ${logKey} editable=${editable} hidden=${hidden}`)}>
      <MarkWrap mark={mark} textColor={textColor} flex collapsable={false}>
        <TextInput
          ref={inputRef}
          style={[styles.input, {color: textColor, borderColor}]}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          blurOnSubmit={false}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={e => onSelectionChange(e.nativeEvent.selection)}
          selection={selection ?? undefined}
          onFocus={() => {
            log(`QuickAdd: field focus=on ${logKey}`);
            onFocus();
          }}
          onBlur={() => {
            log(`QuickAdd: field focus=off ${logKey}`);
            onBlur();
          }}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          editable={editable}
          autoCapitalize="none"
        />
      </MarkWrap>
      {strips}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: FORM_FIELD_HEIGHT,
    marginBottom: QUICK_ADD_ROWS.gap,
    flexDirection: 'row',
    // The strips' positioning context.
    position: 'relative',
  },
  input: {
    flex: 1,
    height: FORM_FIELD_HEIGHT,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: FONT.medium,
    lineHeight: 22,
  },
  hidden: {display: 'none'},
});
