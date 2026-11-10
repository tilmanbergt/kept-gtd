/**
 * The Inbox card (docs/dev/history/technical-design-calmer-screens.md §3.7):
 * after one tap on an Inbox todo or meeting in an Inbox list, in Quick Add's
 * box, at the box's row heights. Its main action is to give the item a place.
 *   R1 "Inbox · captured 2.11." (a meeting: its date), ✕
 *   R2 the title (a tap edits)
 *   R3 File to: up to four suggested places (domain/inboxFileTo.ts) - the
 *      abbreviation, or a short name - and More…
 *   R4 grey: ✓ Done · Edit · Delete · → New project
 * A tap on a place files the item there at once (ui/useInboxFiling.ts).
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FileToItem} from '../../domain/captureFileTo';
import {FONT} from '../theme';
import {cardStyles, CardRow1, TextButton} from './parts';
import {useCardCommitTrace} from './useCardCommitTrace';

export interface InboxCardData {
  caption: string;
  title: string;
  /** A todo: done or not; null for a meeting (no Done). */
  done: boolean | null;
  suggestions: FileToItem[];
  onFile: (place: FileToItem) => void;
  /** The picker (More…); absent: not offered. */
  onMore?: () => void;
  onNewProject?: () => void;
  onToggleDone?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const SHORT_NAME = 12;

/** A place's button: its abbreviation as a tag, or its name, shortened. */
export function placeLabel(place: Pick<FileToItem, 'abbrev' | 'name'>): string {
  if (place.abbrev) return `#${place.abbrev.toUpperCase()}`;
  return place.name.length > SHORT_NAME ? `${place.name.slice(0, SHORT_NAME - 1).trimEnd()}…` : place.name;
}

interface Props {
  card: InboxCardData;
  textColor: string;
  borderColor: string;
}

export default function InboxCard({card, textColor, borderColor}: Props): React.JSX.Element {
  useCardCommitTrace('inbox');
  const colors = {textColor, borderColor};
  return (
    <View>
      <CardRow1 heading={card.caption} onClose={card.onClose} {...colors} />
      <View style={[cardStyles.row, cardStyles.row2]}>
        <Text style={[cardStyles.title, {color: textColor}, card.done === true && cardStyles.struck]} numberOfLines={1} onPress={card.onEdit} accessibilityRole="button" accessibilityHint="Edit">
          {card.title}
        </Text>
      </View>
      <View style={[cardStyles.row, cardStyles.row3]}>
        <Text style={[styles.label, {color: textColor}]}>File to</Text>
        {card.suggestions.map(place => (
          <TextButton key={place.path} label={`File to ${place.name}`} text={placeLabel(place)} onPress={() => card.onFile(place)} shrink {...colors} />
        ))}
        {card.onMore ? <TextButton label="More places" text="More…" onPress={card.onMore} {...colors} /> : null}
      </View>
      <View style={[cardStyles.row, cardStyles.row4, styles.quiet]}>
        {card.done !== null && card.onToggleDone ? (
          <TextButton label="Done" text={card.done ? '✓ Done' : '☐ Done'} on={card.done} onPress={card.onToggleDone} {...colors} />
        ) : null}
        <TextButton label="Edit" onPress={card.onEdit} {...colors} />
        <TextButton label="Delete" onPress={card.onDelete} {...colors} />
        {card.onNewProject ? <TextButton label="New project" text="→ New project" onPress={card.onNewProject} {...colors} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {fontSize: FONT.small, fontWeight: '700'},
  // The grey row: secondary actions, drawn lighter (no meaning in colour).
  quiet: {opacity: 0.7},
});
