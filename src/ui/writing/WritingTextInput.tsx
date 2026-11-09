/**
 * A one-line Quick Add text field with the writing strip
 * (docs/dev/history/technical-design-writing-help.md §3.4): the note title
 * and the agreement words. Looks like ui/ClipboardTextInput.tsx, which stays
 * as it is for the fields outside Quick Add; the state lives in the draft's
 * `useWritingField`.
 */
import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {StripPlacement} from '../ClipboardStrip';
import {TEXT_FIELD_MIN_H} from '../ClipboardTextInput';
import {FONT} from '../theme';
import {WritingField} from './useWritingField';
import WritingStrip from './WritingStrip';

interface Props {
  field: WritingField;
  value: string;
  onSubmitEditing?: () => void;
  placeholder: string;
  placeholderColor: string;
  textColor: string;
  borderColor: string;
  editable?: boolean;
  stripPlacement?: StripPlacement;
}

export default function WritingTextInput({field, value, onSubmitEditing, placeholder, placeholderColor, textColor, borderColor, editable = true, stripPlacement}: Props): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <TextInput
        ref={field.inputRef}
        style={[styles.input, {color: textColor, borderColor}]}
        value={value}
        onChangeText={field.help.onChangeText}
        onSubmitEditing={onSubmitEditing}
        onSelectionChange={e => field.onSelectionChange(e.nativeEvent.selection)}
        selection={field.selectionOverride ?? undefined}
        onFocus={() => field.onFocusChange(true)}
        onBlur={() => field.onFocusChange(false)}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        editable={editable}
        autoCapitalize="none"
      />
      <WritingStrip
        visible={field.focused}
        content={field.help.strip}
        actions={field.help.actions}
        clipboard={field.clipboard}
        placement={stripPlacement}
        textColor={textColor}
        borderColor={borderColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: TEXT_FIELD_MIN_H,
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: FONT.medium,
  },
});
