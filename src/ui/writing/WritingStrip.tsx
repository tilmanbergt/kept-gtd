/**
 * The writing help's strip over a Quick Add text or time field
 * (docs/dev/history/technical-design-writing-help.md §3.3, §3.4): renders
 * one `stripContent` - fixes, "read as … · Undo", a choice, completions,
 * the feedback line, a time with its length, the usual slot, or the
 * clipboard buttons - with the hovering-strip styles of ui/ClipboardStrip.tsx.
 *
 * Always mounted, hidden with `display: 'none'` while the field has no
 * focus: blur fires on touch-down, and a strip torn out of the tree then
 * would lose the tap on its button (same mechanics as ClipboardStrip). Every
 * variant ends in ✕, which hides it until the field gains focus again.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {StripContent} from '../../domain/writing/stripContent';
import {ClipboardActions, StripHideButton, StripPlacement, useStripHide} from '../ClipboardStrip';
import {common} from '../commonStyles';
import {WritingStripActions} from './useWritingHelp';

interface Props {
  visible: boolean;
  content: StripContent;
  actions: WritingStripActions;
  /** The clipboard buttons, for a text field's resting state and Edit ›. */
  clipboard?: ClipboardActions;
  placement?: StripPlacement;
  textColor: string;
  borderColor: string;
}

const CLIPBOARD: Array<{label: string; action: keyof ClipboardActions}> = [
  {label: 'All', action: 'selectAll'},
  {label: 'Copy', action: 'copy'},
  {label: 'Cut', action: 'cut'},
  {label: 'Paste', action: 'paste'},
];

export default function WritingStrip({visible, content, actions, clipboard, placement = 'above-right', textColor, borderColor}: Props): React.JSX.Element {
  const {shown, hide} = useStripHide(visible);
  const button = (label: string, onPress: () => void, key = label, extra?: string) => (
    <Pressable key={key} style={[common.floatingStripButton, {borderColor}]} onPress={onPress} hitSlop={6}>
      <Text numberOfLines={1} style={[common.floatingStripButtonText, {color: textColor}]}>
        {label}
        {extra ? <Text style={styles.secondary}>{` ${extra}`}</Text> : null}
      </Text>
    </Pressable>
  );
  const label = (text: string) => (
    <Text key={`label:${text}`} numberOfLines={1} style={[common.floatingStripButtonText, styles.label, {color: textColor}]}>
      {text}
    </Text>
  );

  let body: React.ReactNode[] = [];
  switch (content.kind) {
    case 'fixes':
      body = [
        ...content.fixes.map((f, i) => button(`→ #${f.suggestion}`, () => actions.apply(i), `fix:${i}`)),
        button('Keep', actions.keep),
        button('Edit ›', actions.edit),
      ];
      break;
    case 'read':
      body = [label(content.label), button('Undo', actions.undo)];
      break;
    case 'choice':
      body = [label('Did you mean'), ...content.options.map(o => button(o.label, () => actions.choose(o.value), `choice:${o.value}`))];
      break;
    case 'complete':
      body = [...content.options.map(o => button(`#${o.tag}`, () => actions.complete(o.tag), `complete:${o.tag}`, o.name)), button('Edit ›', actions.edit)];
      break;
    case 'feedback':
      body = [label(content.text)];
      break;
    case 'time':
      body = [label(content.warning ? `${content.label} · ${content.warning}` : content.label)];
      break;
    case 'usual':
      body = [button(content.usual, actions.usual)];
      break;
    case 'clipboard':
      body = clipboard ? CLIPBOARD.map(({label: text, action}) => button(text, () => {
            clipboard[action]();
          })) : [];
      break;
    case 'date':
    case 'none':
      body = [];
      break;
  }
  const empty = body.length === 0;
  return (
    <View style={[common.floatingStrip, placement === 'above-left' && common.floatingStripLeft, {borderColor}, (!shown || empty) && styles.hidden]}>
      {body}
      <StripHideButton onPress={hide} textColor={textColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {display: 'none'},
  label: {
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  /** An abbreviation's Project/Area name next to it: secondary, never the only cue. */
  secondary: {
    opacity: 0.6,
  },
});
