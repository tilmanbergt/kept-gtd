/**
 * ItemContextRows — ItemScopeRow (docs/dev/history/technical-design-review-master-detail.md
 * §Component inventory), shared by ui/ItemScopePanel.tsx's Current tab and
 * Review's master-detail detail panels (Stalled projects, Neglected areas,
 * Done awaiting review, On Hold reconsideration), so both show Scope with the
 * same visual/UX logic (including the tap-to-edit convention).
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import InlineTextEditor from './InlineTextEditor';
import {FONT} from './theme';

/**
 * The Scope text - see ui/ItemScopePanel.tsx's module doc comment's "Scope"
 * paragraph for the display/edit rules. Not editing: shows the current
 * scope plain (no `numberOfLines` truncation - Scope is meant to hold the
 * fuller 1-3 sentence description rather than a short phrase) or, when
 * empty, the dim "+ Add a scope" prompt - both tappable to enter edit mode.
 * Never `disabled` by status. Editing: ui/InlineTextEditor.tsx in its
 * multiline mode.
 */
export function ItemScopeRow({
  scope,
  onSaveScope,
  textColor,
  borderColor,
  placeholderColor,
}: {
  scope: string;
  onSaveScope: (text: string) => Promise<void>;
  textColor: string;
  borderColor: string;
  placeholderColor: string;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <InlineTextEditor
        initialText={scope}
        onSave={onSaveScope}
        onClose={() => setEditing(false)}
        placeholder="What is this project/area about? (1-3 sentences)"
        multiline
        logLabel="ItemScopeRow: save scope failed"
        textColor={textColor}
        borderColor={borderColor}
        placeholderColor={placeholderColor}
      />
    );
  }

  return (
    <Pressable onPress={() => setEditing(true)} hitSlop={4}>
      <Text style={[styles.scopeRow, {color: textColor}, !scope && styles.scopeRowEmpty]}>
        {scope || '+ Add a scope'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scopeRow: {
    fontSize: FONT.medium,
    marginBottom: 4,
  },
  scopeRowEmpty: {
    opacity: 0.6,
  },
});
