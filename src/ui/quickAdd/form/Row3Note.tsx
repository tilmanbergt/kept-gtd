/**
 * Row 3 of the note form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.3): the folder the note lands in - the folder the Files pane shows, read
 * at + Create - in grey.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FONT} from '../../theme';
import {rowStyles} from '../styles';
import {FolderIcon} from '../../icons';

interface Props {
  /** The folder below its root, or null when the Files pane shows none. */
  folder: string | null;
  hidden: boolean;
  textColor: string;
}

export default function Row3Note({folder, hidden, textColor}: Props): React.JSX.Element {
  return (
    <View style={[rowStyles.row3, rowStyles.row3Start, hidden && rowStyles.hidden]}>
      {folder ? <FolderIcon size={16} color={textColor} /> : null}
      <Text style={[styles.folder, {color: textColor}]} numberOfLines={1}>
        {folder ?? 'Open a folder in the Files pane'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  folder: {fontSize: FONT.small, flexShrink: 1, marginLeft: 4},
});
