/**
 * The pieces both item cards are built from (ui/itemCard/MeetingCard.tsx,
 * TodoCard.tsx): the rows at the Quick Add box's heights, R1 with ✕, the
 * refile arrow and Edit, the two-line title area, the 32 dp square button
 * (filled when on), the done box, the notebook and the clip
 * (docs/dev/history/technical-design-quickadd-redesign.md §11 G9, G10).
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ClipIcon, NotebookIcon} from '../icons';
import {quickAddButtons} from '../quickAdd/ActionRow';
import {QUICK_ADD_ROWS} from '../quickAdd/QuickAddFrame';
import {FONT} from '../theme';
import {RefileIcon} from './icons';

export interface CardColors {
  textColor: string;
  borderColor: string;
}

function inverse(color: string): string {
  const c = color.toLowerCase();
  return c === '#000' || c === '#000000' || c === 'black' ? '#ffffff' : '#000000';
}

/** A 32 dp square button: outlined, or filled when `on`; its content gets the colour to draw in. */
export function SquareButton(
  props: {
    label: string;
    on?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    children: (color: string) => React.ReactNode;
  } & CardColors,
) {
  const {label, on = false, disabled = false, onPress, textColor, borderColor} = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, selected: on}}
      style={[styles.square, {borderColor: on ? textColor : borderColor}, on && {backgroundColor: textColor}, disabled && styles.disabled]}>
      {props.children(on ? inverse(textColor) : textColor)}
    </Pressable>
  );
}

/** A letter or short word (P, R, M, Now) as a square button's content. */
export function letter(text: string) {
  return function LetterIcon(color: string) {
    return <Text style={[styles.letter, {color}]}>{text}</Text>;
  };
}

/**
 * A word button at the card's 32 dp height (✓ Done, w/f, Someday, More ›): outlined, or filled when
 * `on`. `label` is what screen readers hear (and what scenarios tap); `text` is drawn, `label` when absent.
 */
export function TextButton(
  props: {label: string; text?: string; on?: boolean; disabled?: boolean; onPress?: () => void; shrink?: boolean} & CardColors,
) {
  const {label, text, on = false, disabled = false, onPress, shrink = false, textColor, borderColor} = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, selected: on}}
      style={[styles.textButton, shrink && styles.shrink, {borderColor: on ? textColor : borderColor}, on && {backgroundColor: textColor}, disabled && styles.disabled]}>
      <Text style={[styles.textButtonText, {color: on ? inverse(textColor) : textColor}]} numberOfLines={1}>
        {text ?? label}
      </Text>
    </Pressable>
  );
}

/** The compact card's R3 on its first page: one grey line - a link when it opens something. */
export function DetailLine(props: {text: string; onPress?: () => void} & CardColors) {
  const {text, onPress, textColor} = props;
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={6} style={styles.detail}>
      <Text style={[styles.detailText, {color: textColor}, !!onPress && styles.underline]} numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

/**
 * R1: the heading, an optional link next to it (the owner, opening it) and the state after it,
 * then the card's own new-item button (`+ Todo`, `+ Meeting`), ✕ and (where given) Edit at the
 * right. The heading and the link shorten first; the buttons keep their room.
 */
export function CardRow1(
  props: {
    heading: string;
    link?: {label: string; onPress?: () => void} | null;
    /** After the link: `· due 5.11.`. */
    status?: string;
    /** `+ Todo` / `+ Meeting`: the next item for the same place. */
    next?: {label: string; onPress: () => void} | null;
    onClose: () => void;
    onEdit?: () => void;
    /** The refile arrow after the place (§11 G9), where refiling is possible. */
    onRefile?: () => void;
  } & CardColors,
) {
  const {heading, link, status, next, onClose, onEdit, onRefile, textColor, borderColor} = props;
  return (
    <View style={[styles.row, styles.row1]}>
      {status !== undefined && onRefile ? (
        // With the arrow: the place, the arrow, then the state, which shortens first.
        <View style={styles.headingParts} testID="card-heading">
          <Text style={[styles.heading, styles.noShrink, {color: textColor}]} numberOfLines={1}>
            {heading}
            {link ? (heading ? ' · ' : '') : ''}
            {link ? (
              <Text style={[styles.linkInline, !!link.onPress && styles.underline]} onPress={link.onPress} accessibilityRole="link">
                {link.label}
              </Text>
            ) : null}
          </Text>
          <Pressable onPress={onRefile} hitSlop={6} style={styles.refileInline} accessibilityRole="button" accessibilityLabel="Refile">
            <RefileIcon size={18} color={textColor} />
          </Pressable>
          {status ? (
            <Text style={[styles.heading, styles.statusInline, {color: textColor}]} numberOfLines={1}>
              {` ${status}`}
            </Text>
          ) : null}
        </View>
      ) : status !== undefined ? (
        // One line that shortens as a whole; the owner is a nested span that opens it.
        <Text style={[styles.heading, {color: textColor}]} numberOfLines={1} testID="card-heading">
          {heading}
          {link ? (heading ? ' · ' : '') : ''}
          {link ? (
            <Text style={[styles.linkInline, !!link.onPress && styles.underline]} onPress={link.onPress} accessibilityRole="link">
              {link.label}
            </Text>
          ) : null}
          {status ? <Text style={styles.statusInline}>{` ${status}`}</Text> : null}
        </Text>
      ) : (
        <>
          <Text style={[styles.heading, {color: textColor}]} numberOfLines={1} ellipsizeMode="middle">
            {heading}
          </Text>
          {link ? (
            <Pressable onPress={link.onPress} disabled={!link.onPress} hitSlop={6} style={styles.link} accessibilityRole="link">
              <Text style={[styles.linkText, {color: textColor}, !!link.onPress && styles.underline]} numberOfLines={1}>
                {link.label}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
      <View style={styles.spacer} />
      {next ? (
        <Pressable onPress={next.onPress} hitSlop={6} style={[styles.next, {borderColor}]} accessibilityRole="button" accessibilityLabel={next.label}>
          <Text style={[styles.nextText, {color: textColor}]}>{next.label}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={[quickAddButtons.textButton, {color: textColor}]}>✕</Text>
      </Pressable>
      {onEdit ? (
        <Pressable style={quickAddButtons.primaryButton} onPress={onEdit} hitSlop={8}>
          <Text style={quickAddButtons.primaryButtonText}>Edit</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The done box (§11 G9): Engage's, smaller - a thick-bordered square, ✓ once done, no word. */
export function DoneBox(props: {done: boolean; onPress: () => void} & CardColors) {
  const {done, onPress, textColor} = props;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityLabel="Done"
      accessibilityState={{checked: done}}
      style={[styles.doneBox, {borderColor: textColor}]}>
      {done ? <Text style={[styles.doneMark, {color: textColor}]}>✓</Text> : null}
    </Pressable>
  );
}

/** The notebook (§11 G9): with + until the note exists (a tap creates it), plain once it does (a tap opens it). */
export function NoteSquare(props: {note: 'open' | 'create' | 'home'; onPress: () => void} & CardColors) {
  const {note, onPress, textColor, borderColor} = props;
  const label = note === 'open' ? 'Open note' : note === 'home' ? 'Home notebook' : 'Create note';
  return (
    <SquareButton label={label} onPress={onPress} textColor={textColor} borderColor={borderColor}>
      {color => <NotebookIcon size={22} color={color} plus={note === 'create'} />}
    </SquareButton>
  );
}

/**
 * The clip (§11 G9): with + while nothing is linked (a tap starts linking), filled once a file is
 * linked (a tap opens it); nothing where the screen can neither link nor shows a file. Unlinking is
 * in the edit form.
 */
export function ClipSquare(props: {file: {kind: 'linked'; name: string} | {kind: 'link'} | null; onOpen?: () => void; onLink?: () => void} & CardColors) {
  const {file, onOpen, onLink, textColor, borderColor} = props;
  if (file?.kind === 'linked') {
    return (
      <SquareButton label="Open linked file" on onPress={onOpen} textColor={textColor} borderColor={borderColor}>
        {color => <ClipIcon size={18} color={color} />}
      </SquareButton>
    );
  }
  if (file?.kind === 'link') {
    return (
      <SquareButton label="Link file" onPress={onLink} textColor={textColor} borderColor={borderColor}>
        {color => (
          <View style={styles.plusClip}>
            <Text style={[styles.plus, {color}]}>+</Text>
            <ClipIcon size={14} color={color} />
          </View>
        )}
      </SquareButton>
    );
  }
  return null;
}

/** A square's room kept empty (Cancel meeting once the meeting has started), so nothing moves. */
export function EmptySquare() {
  return <View style={styles.squareRoom} />;
}

/**
 * R2-R3 (§11 G9, G10): the title over two lines (a tap edits), ending in "…" after the second; the
 * origin or thread on its own line at the bottom right.
 */
export function TitleArea(props: {title: string; struck?: boolean; onEdit: () => void; foot?: React.ReactNode} & CardColors) {
  const {title, struck = false, onEdit, foot, textColor} = props;
  return (
    <View style={cardStyles.titleArea}>
      <Text style={[cardStyles.title, {color: textColor}, struck && cardStyles.struck]} numberOfLines={2} onPress={onEdit} accessibilityRole="button" accessibilityHint="Edit">
        {title}
      </Text>
      {foot ? <View style={styles.foot}>{foot}</View> : null}
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  row2: {height: QUICK_ADD_ROWS.input, marginBottom: QUICK_ADD_ROWS.gap},
  row3: {height: QUICK_ADD_ROWS.meta, marginBottom: QUICK_ADD_ROWS.gap, gap: 6},
  row4: {height: QUICK_ADD_ROWS.extra, gap: 6},
  /** R2 and R3 as one text area: 36 + 6 + 34 dp. */
  titleArea: {height: QUICK_ADD_ROWS.input + QUICK_ADD_ROWS.gap + QUICK_ADD_ROWS.meta, marginBottom: QUICK_ADD_ROWS.gap},
  spacer: {flex: 1},
  title: {flexShrink: 1, fontSize: FONT.medium, fontWeight: '600'},
  struck: {textDecorationLine: 'line-through'},
  small: {fontSize: FONT.small, marginLeft: 8},
});

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  row1: {height: QUICK_ADD_ROWS.tabs, marginBottom: QUICK_ADD_ROWS.gap},
  spacer: {flex: 1},
  heading: {fontSize: FONT.small, fontWeight: '700', flexShrink: 1},
  textButton: {height: 32, borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0},
  shrink: {flexShrink: 1},
  textButtonText: {fontSize: FONT.small, fontWeight: '600'},
  detail: {flexShrink: 1},
  // Secondary, not a meaning: drawn lighter than the title in either theme.
  detailText: {fontSize: FONT.small, opacity: 0.65},
  link: {marginLeft: 12, flexShrink: 1},
  linkText: {fontSize: FONT.small},
  linkInline: {fontWeight: '400'},
  statusInline: {fontWeight: '400'},
  next: {height: 32, borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, justifyContent: 'center', marginRight: 10, flexShrink: 0},
  nextText: {fontSize: FONT.small, fontWeight: '600'},
  underline: {textDecorationLine: 'underline'},
  square: {width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center'},
  disabled: {opacity: 0.35},
  letter: {fontSize: FONT.small, fontWeight: '700'},
  plusClip: {flexDirection: 'row', alignItems: 'center'},
  headingParts: {flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0},
  noShrink: {flexShrink: 0, maxWidth: '60%'},
  refileInline: {marginHorizontal: 6, justifyContent: 'center'},
  doneBox: {width: 28, height: 28, borderWidth: 3, borderRadius: 3, alignItems: 'center', justifyContent: 'center', marginRight: 2},
  doneMark: {fontSize: FONT.medium, fontWeight: '800', includeFontPadding: false},
  squareRoom: {width: 32, height: 32},
  foot: {position: 'absolute', right: 0, bottom: 0, maxWidth: '70%', paddingLeft: 8, backgroundColor: '#ffffff'},
  plus: {fontSize: FONT.small, fontWeight: '700'},
});
