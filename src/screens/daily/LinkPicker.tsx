/**
 * Linking a file from a Daily card (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.6, F1): Daily has no Files pane, so the card's 📎 opens this picker in the
 * list's place, the card staying in the box above - like the Inbox card's
 * More… (screens/daily/FilePicker.tsx). The Projects, Areas, Resources and
 * Inbox folders and, when Kept was opened from a file, the This-file rows;
 * a file tap links it and returns to the card. ‹ Back to the card links
 * nothing.
 */
import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ResolvedParaPaths} from '../../domain/settings';
import {pickedPath} from '../../storage/linkedFiles';
import FileBrowserPane, {FileBrowserRoot, LinkTarget} from '../../ui/FileBrowserPane';
import {FONT} from '../../ui/theme';

interface Props {
  paths: ResolvedParaPaths;
  /** Called with the picked file's absolute path (with `#page=n` from a This-file row). */
  onPick: (absolutePath: string) => void;
  onBack: () => void;
  textColor: string;
  borderColor: string;
}

export default function LinkPicker({paths, onPick, onBack, textColor, borderColor}: Props): React.JSX.Element {
  const roots: FileBrowserRoot[] = useMemo(
    () => [
      {key: 'projects', label: 'Projects', rootPath: paths.projects},
      {key: 'areas', label: 'Areas', rootPath: paths.areas},
      {key: 'resources', label: 'Resources', rootPath: paths.resources},
      {key: 'inbox', label: 'Inbox', rootPath: paths.inboxFolder},
    ],
    [paths],
  );
  const rootPath = (key: string) => roots.find(r => r.key === key)?.rootPath ?? paths.base;
  const linkTarget: LinkTarget = {
    mode: 'arming',
    onPick: (rootKey, relativePath) => onPick(pickedPath(rootPath(rootKey), relativePath)),
    onCancel: onBack,
    label: 'Select attachment: tap a file to link it',
  };
  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
        <Text style={[styles.backText, {color: textColor}]}>‹ Back to the card</Text>
      </Pressable>
      <FileBrowserPane roots={roots} linkTarget={linkTarget} resetKey="daily:link" thisFileRows textColor={textColor} borderColor={borderColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  back: {paddingVertical: 6},
  backText: {fontSize: FONT.small, fontWeight: '700'},
});
