/**
 * Settings → Input (docs/dev/history/technical-design-writing-help.md §1.5,
 * §3.9): how text gets into Kept. Two paged lists, side by side:
 *
 * - "Learned corrections": the pairs the writing help learned from a tap on
 *   `→ #x` (storage/learnedTagFixes.ts); ✕ forgets one.
 * - "Tags that look like a typo": tags used once, one step from a known tag
 *   (storage/tagTypoLines.ts), each with the line it is on and its Project or
 *   Area. `→ #x` rewrites that one line in its file; Keep leaves it as written
 *   and takes it off the list for this profile.
 *
 * No draft and no Save: every action is one immediate tap. Paged, never
 * scrolled (DEVELOPMENT-POLICY §4); a typo row's two lines have a fixed height.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useCachedInbox} from '../../ui/useCachedInbox';
import {useCachedItems} from '../../ui/useCachedItems';
import PagedSection from '../../ui/PagedSection';
import {useStatus} from '../../ui/status/StatusProvider';
import {useActionError} from '../../ui/useActionError';
import {FONT, SPACING} from '../../ui/theme';
import {forgetFix, keepTypoTag, LearnedFix, learnedFixList, loadLearnedFixes, subscribeLearnedFixes} from '../../storage/learnedTagFixes';
import {currentTypoLines, fixTypoLine, TypoLine} from '../../storage/tagTypoLines';
import {errorMessage} from '../../utils/errorMessage';
import {log, logWarn} from '../../utils/log';
import {requestEinkRefresh} from '../../utils/screenRefresh';

const LEARNED_ROW_H = 40;
const TYPO_ROW_H = 64;

interface Props {
  textColor: string;
  borderColor: string;
}

/** Re-renders after every change of the learned corrections or kept tags. */
function useLearnedFixes(): readonly LearnedFix[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeLearnedFixes(() => setTick(t => t + 1));
    loadLearnedFixes(true)
      .then(requestEinkRefresh)
      .catch(e => logWarn('InputTab: learned corrections not loaded', errorMessage(e)));
    return unsubscribe;
  }, []);
  return learnedFixList();
}

export default function InputTab({textColor, borderColor}: Props): React.JSX.Element {
  const learned = useLearnedFixes();
  // The typo list follows the cache: a fix writes it through.
  useCachedItems();
  useCachedInbox();
  const typos = currentTypoLines();
  const action = useActionError('settings.input.error', 'InputTab: fix failed');
  const [done, setDone] = useState<string | null>(null);
  useStatus('settings.input.done', done ? {kind: 'success', text: done, onDismiss: () => setDone(null)} : null);

  const fix = (line: TypoLine) =>
    action.run(async () => {
      setDone(null);
      await fixTypoLine(line);
      setDone(`Changed #${line.typo.tag} to #${line.typo.suggestion} in ${line.item.name}`);
      requestEinkRefresh();
    });
  const keep = (line: TypoLine) => {
    log('InputTab: typo kept');
    keepTypoTag(line.typo.tag).catch(e => logWarn('InputTab: keep failed', errorMessage(e)));
  };
  const forget = (pair: LearnedFix) => {
    log('InputTab: learned correction forgotten');
    forgetFix(pair.from).catch(e => logWarn('InputTab: forget failed', errorMessage(e)));
  };

  const button = (label: string, onPress: () => void, a11y?: string) => (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.button, {borderColor}]} accessibilityLabel={a11y}>
      <Text style={[styles.buttonText, {color: textColor}]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <View style={styles.column}>
        <PagedSection
          header="Learned corrections"
          rows={learned as LearnedFix[]}
          rowHeight={() => LEARNED_ROW_H}
          heightKey="settings:input:learned"
          emptyHint="None yet. When you tap a suggested tag in Quick Add, Kept writes it that way next time."
          renderRow={pair => (
            <View key={pair.from} style={[styles.learnedRow, {height: LEARNED_ROW_H}]}>
              <Text style={[styles.text, {color: textColor}]} numberOfLines={1}>
                {`#${pair.from} → #${pair.to}`}
              </Text>
              {button('✕', () => forget(pair), `Forget #${pair.from}`)}
            </View>
          )}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
      <View style={[styles.divider, {backgroundColor: borderColor}]} />
      <View style={styles.column}>
        <PagedSection
          header="Tags that look like a typo"
          rows={typos}
          rowHeight={() => TYPO_ROW_H}
          heightKey="settings:input:typos"
          emptyHint="None: every tag used once is either new or far from the tags you use."
          renderRow={line => (
            <View key={`${line.item.path}#${line.entity}${line.index}`} style={[styles.typoRow, {height: TYPO_ROW_H}]}>
              <View style={styles.typoTop}>
                <Text style={[styles.text, styles.tag, {color: textColor}]} numberOfLines={1}>{`#${line.typo.tag}`}</Text>
                {button(`→ #${line.typo.suggestion}`, () => fix(line))}
                {button('Keep', () => keep(line))}
              </View>
              <Text style={[styles.where, {color: textColor}]} numberOfLines={1}>
                {`${line.item.name} · ${line.text}`}
              </Text>
            </View>
          )}
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flex: 1},
  column: {flex: 1},
  divider: {width: 1, marginHorizontal: SPACING.base},
  learnedRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  typoRow: {justifyContent: 'center'},
  typoTop: {flexDirection: 'row', alignItems: 'center'},
  text: {fontSize: FONT.small, flexShrink: 1},
  tag: {flex: 1, fontWeight: '600'},
  where: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
  button: {borderWidth: 1, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, marginLeft: SPACING.sm},
  buttonText: {fontSize: FONT.small},
});
