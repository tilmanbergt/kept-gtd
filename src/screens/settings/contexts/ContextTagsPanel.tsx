/**
 * The Tags tab of the contexts editor (docs/dev/history/technical-design-contexts-tags.md
 * §2.4): a New tag field, then one chip per loop kind and thread type ("All
 * #read loops"), the tags the context names, and the plain tags in use. A tap
 * adds or removes the tag on the side being edited.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ContextKinds} from '../../../domain/contexts';
import ClipboardTextInput from '../../../ui/ClipboardTextInput';
import TagChipGrid, {GridChip} from '../../../ui/TagChipGrid';
import {styles} from '../settingsStyles';
import {setupStyles} from '../noteSetups/noteSetupsStyles';

interface Props {
  /** The tags the context names, either side. */
  named: readonly string[];
  /** Plain tags in use, most used first. */
  inUse: readonly string[];
  kinds: ContextKinds;
  chip: (tag: string, label: string) => GridChip;
  /** Adds a typed tag; false when it isn't one. */
  onAdd: (text: string) => boolean;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

export default function ContextTagsPanel({named, inUse, kinds, chip, onAdd, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const [text, setText] = useState('');
  const roots = [...kinds.loopKinds.map(t => chip(t, `All #${t} loops`)), ...kinds.threadTypes.map(t => chip(t, `All #${t} threads`))];
  const rootTags = new Set([...kinds.loopKinds, ...kinds.threadTypes]);
  const plain = Array.from(new Set([...named, ...inUse])).filter(t => !rootTags.has(t));
  const add = () => {
    if (onAdd(text)) setText('');
  };
  return (
    <View style={local.panel}>
      <View style={setupStyles.fieldRow}>
        <View style={[setupStyles.fieldControl, styles.clipboardFieldRow]}>
          <ClipboardTextInput value={text} onChangeText={setText} placeholder="New tag, e.g. errand" placeholderColor={placeholderColor} textColor={textColor} borderColor={borderColor} />
        </View>
        <Pressable onPress={add} hitSlop={8} style={[setupStyles.pageRowButton, {borderColor}]} accessibilityRole="button">
          <Text style={[setupStyles.pageRowButtonText, {color: textColor}]}>Add</Text>
        </Pressable>
      </View>
      <TagChipGrid chips={[...roots, ...plain.map(t => chip(t, `#${t}`))]} maxChips={40} maxLabelChars={24} textColor={textColor} borderColor={borderColor} />
    </View>
  );
}

const local = StyleSheet.create({
  panel: {flex: 1},
});
