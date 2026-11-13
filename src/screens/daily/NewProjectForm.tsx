/**
 * → New project from an Inbox todo (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): in the list's place, the card staying in the box above. Everything
 * is prefilled, nothing is created without the tap on Create project:
 * - Name: the todo's words without tags and a leading "Idea:"
 *   (domain/projectFromItem.ts), the cursor in it;
 * - Abbreviation: suggested from the name (domain/abbrev.ts) until edited,
 *   checked with validateAbbrev;
 * - the todo: first todo with #next (default), first todo, or "was only the
 *   name: remove it".
 * The project gets no Undo (O2): removing a folder is a delete; the status
 * line offers Open › instead.
 */
import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {abbrevErrorMessage, ExistingAbbrev, generateDefaultAbbrev, validateAbbrev} from '../../domain/abbrev';
import {NewProjectTodo, projectNameFromItem} from '../../domain/projectFromItem';
import ClipboardTextInput, {ClipboardTextInputHandle} from '../../ui/ClipboardTextInput';
import PillButton from '../../ui/PillButton';
import {useErrorStatus} from '../../ui/status/StatusProvider';
import {FONT} from '../../ui/theme';

interface Props {
  /** The todo's text as shown. */
  itemText: string;
  existingAbbrevs: ExistingAbbrev[];
  onCreate: (form: {name: string; abbrev: string; todo: NewProjectTodo}) => Promise<boolean>;
  onBack: () => void;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}

const CHOICES: Array<{key: NewProjectTodo; label: string}> = [
  {key: 'next', label: 'First todo, #next'},
  {key: 'todo', label: 'First todo'},
  {key: 'remove', label: 'Was only the name: remove it'},
];

export default function NewProjectForm({itemText, existingAbbrevs, onCreate, onBack, textColor, borderColor, placeholderColor}: Props): React.JSX.Element {
  const [name, setName] = useState(() => projectNameFromItem(itemText));
  const [abbrevEdited, setAbbrevEdited] = useState<string | null>(null);
  const [todo, setTodo] = useState<NewProjectTodo>('next');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<ClipboardTextInputHandle>(null);
  useEffect(() => nameRef.current?.focus(), []);
  const abbrev = abbrevEdited ?? (name.trim() ? generateDefaultAbbrev(name.trim(), existingAbbrevs) : '');
  const validation = validateAbbrev(abbrev, existingAbbrevs);
  const abbrevProblem = name.trim() ? abbrevErrorMessage(validation) : '';
  const problem = name.trim() ? abbrevProblem : 'Enter a name.';
  // What is wrong with the abbreviation goes to the status slot (no inline warning lines).
  useErrorStatus('NewProjectForm.abbrev', abbrevProblem || null);
  const create = () => {
    if (problem || busy) return;
    setBusy(true);
    onCreate({name: name.trim(), abbrev: abbrev.trim(), todo}).finally(() => setBusy(false));
  };
  const field = {placeholderColor, textColor, borderColor};
  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
        <Text style={[styles.backText, {color: textColor}]}>‹ Back to the card</Text>
      </Pressable>
      <Text style={[styles.label, {color: textColor}]}>New project</Text>
      <ClipboardTextInput value={name} onChangeText={setName} placeholder="Project name" handleRef={nameRef} editable={!busy} {...field} />
      <Text style={[styles.label, {color: textColor}]}>Abbreviation</Text>
      <ClipboardTextInput value={abbrev} onChangeText={setAbbrevEdited} placeholder="e.g. HS" editable={!busy} {...field} />
      <Text style={[styles.label, {color: textColor}]}>The todo</Text>
      <View style={styles.choices}>
        {CHOICES.map(c => (
          <Pressable
            key={c.key}
            onPress={() => setTodo(c.key)}
            accessibilityRole="radio"
            accessibilityState={{selected: todo === c.key}}
            style={styles.choice}
            hitSlop={4}>
            <Text style={[styles.choiceText, {color: textColor}, todo === c.key && styles.chosen]}>{`${todo === c.key ? '◉' : '○'} ${c.label}`}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <PillButton label={busy ? 'Creating…' : 'Create project'} primary disabled={!!problem || busy} onPress={create} textColor={textColor} borderColor={borderColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  back: {paddingVertical: 6},
  backText: {fontSize: FONT.small, fontWeight: '700'},
  label: {fontSize: FONT.small, fontWeight: '700', marginTop: 10, marginBottom: 4},
  choices: {gap: 4},
  choice: {paddingVertical: 4},
  choiceText: {fontSize: FONT.medium},
  chosen: {fontWeight: '700'},
  actions: {flexDirection: 'row', marginTop: 12},
});
