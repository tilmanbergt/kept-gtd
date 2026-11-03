/**
 * The New tag field of the contexts editor's Tags tab (docs/dev/history/technical-design-contexts-tags.md
 * §2.4): a tag no todo carries yet, added to the side being edited. The chips themselves are
 * ContextEditor's paged grid.
 */
import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import ClipboardTextInput from '../../../ui/ClipboardTextInput';
import {styles} from '../settingsStyles';
import {setupStyles} from '../noteSetups/noteSetupsStyles';

interface Props {
  /** Adds a typed tag; false when it isn't one. */
  onAdd: (text: string) => boolean;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function NewTagRow({onAdd, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const [text, setText] = useState('');
  const add = () => {
    if (onAdd(text)) setText('');
  };
  return (
    <View style={setupStyles.fieldRow}>
      <View style={[setupStyles.fieldControl, styles.clipboardFieldRow]}>
        <ClipboardTextInput value={text} onChangeText={setText} placeholder="New tag, e.g. errand" placeholderColor={placeholderColor} textColor={textColor} borderColor={borderColor} />
      </View>
      <Pressable onPress={add} hitSlop={8} style={[setupStyles.pageRowButton, {borderColor}]} accessibilityRole="button">
        <Text style={[setupStyles.pageRowButtonText, {color: textColor}]}>Add</Text>
      </Pressable>
    </View>
  );
}
