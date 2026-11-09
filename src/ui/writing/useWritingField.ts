/**
 * A Quick Add text field with the writing help, for drafts that keep no
 * selection of their own (the note title, the agreement words): the
 * selection ref and its one-render override, focus, the help
 * (ui/writing/useWritingHelp.ts) and the clipboard buttons, in one bundle for
 * ui/writing/WritingTextInput.tsx. The todo and meeting drafts hold the same
 * parts themselves.
 */
import {useRef, useState} from 'react';
import {TextInput} from 'react-native';
import {Selection} from '../../domain/clipboardText';
import {clipboardActions} from '../ClipboardStrip';
import {useWritingHelp, WritingHelpOptions} from './useWritingHelp';

export function useWritingField(options: Omit<WritingHelpOptions, 'field' | 'selectionRef' | 'setSelectionOverride' | 'inputRef'>) {
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef<Selection>(null);
  const [selectionOverride, setSelectionOverride] = useState<Selection>(null);
  const [focused, setFocused] = useState(false);
  const help = useWritingHelp({...options, field: 'text', selectionRef, setSelectionOverride, inputRef});
  const clipboard = clipboardActions(options.value, selectionRef, help.onChangeText, setSelectionOverride);
  // No setState for the selection itself - see domain/clipboardText.ts's `Selection`.
  const onSelectionChange = (selection: Selection) => {
    selectionRef.current = selection;
    if (selectionOverride) setSelectionOverride(null);
    help.onSelectionChange(selection);
  };
  const onFocusChange = (next: boolean) => {
    setFocused(next);
    if (next) help.onFocus();
  };
  return {inputRef, selectionRef, selectionOverride, focused, onFocusChange, onSelectionChange, help, clipboard};
}

export type WritingField = ReturnType<typeof useWritingField>;
