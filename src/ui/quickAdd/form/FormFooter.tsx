/**
 * Row 4 of Quick Add's form (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.4, §11 G5): `[clip] [origin line] … [✕] [main button]`, all 32 dp high.
 * The clip slot is a 📎 square that starts linking where the screen can link,
 * or the linked file's chip with ✕; the grey origin line names where the item
 * comes from, its ✕ drops it for this item. The main button and ✕
 * keep their width; the origin line, then the file name, shorten first (§3.9).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {fileNameOf} from '../../../domain/marks';
import {ClipIcon, WarningIcon} from '../../icons';
import {FONT} from '../../theme';
import {QUICK_ADD_ROWS} from '../QuickAddFrame';

interface Props {
  /** The clip slot: null for none (agreement, note). */
  clip: {linkedFile: string | null; missing?: boolean; onArmLink?: () => void; onClear?: () => void} | null;
  /** The grey origin line, or a loop's own edit commands. */
  origin?: React.ReactNode;
  /** ✕: drops a new item's draft and folds the box, or drops an edit's changes. */
  onClose: () => void;
  main: React.ReactNode;
  hidden?: boolean;
  textColor: string;
  borderColor: string;
}

export default function FormFooter({clip, origin, onClose, main, hidden = false, textColor, borderColor}: Props): React.JSX.Element {
  let clipNode: React.ReactNode = null;
  if (clip?.linkedFile) {
    clipNode = (
      <View style={styles.chip}>
        <ClipIcon size={14} color={textColor} />
        {clip.missing ? <WarningIcon color={textColor} /> : null}
        <Text style={[styles.chipText, {color: textColor}]} numberOfLines={1}>
          {fileNameOf(clip.linkedFile.replace(/#page=\d+$/, ''))}
        </Text>
        {clip.onClear ? (
          <Pressable onPress={clip.onClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Unlink">
            <Text style={[styles.clear, {color: textColor}]}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (clip?.onArmLink) {
    clipNode = (
      <Pressable style={[styles.square, {borderColor}]} onPress={clip.onArmLink} hitSlop={6} accessibilityRole="button" accessibilityLabel="Link a file">
        <ClipIcon size={16} color={textColor} />
      </Pressable>
    );
  }
  return (
    <View style={[styles.row, hidden && styles.hidden]}>
      {clipNode}
      <View style={styles.origin}>{origin}</View>
      {/* On touch-down as well: the field gives up its focus at that moment and the box redraws; a second call changes nothing. */}
      <Pressable onPressIn={onClose} onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close Quick Add" style={styles.close}>
        <Text style={[styles.closeText, {color: textColor}]}>✕</Text>
      </Pressable>
      <View style={styles.main}>{main}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {height: QUICK_ADD_ROWS.extra, flexDirection: 'row', alignItems: 'center'},
  square: {width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 6, flexShrink: 0},
  chip: {flexDirection: 'row', alignItems: 'center', flexShrink: 2, minWidth: 40, marginRight: 6},
  chipText: {fontSize: FONT.small, marginLeft: 3, flexShrink: 1},
  clear: {fontSize: FONT.small, opacity: 0.7, paddingHorizontal: 4},
  origin: {flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minWidth: 0},
  close: {paddingHorizontal: 10, height: 32, justifyContent: 'center', flexShrink: 0},
  closeText: {fontSize: FONT.medium, fontWeight: '700'},
  main: {flexShrink: 0},
  hidden: {display: 'none'},
});
