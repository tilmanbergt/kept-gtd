/**
 * Review step "Agreements" (docs/dev/history/technical-design-meetings-0.21.md
 * R25, §9): the active agreements that need a decision - past their
 * valid-till, of an inactive counterpart, of a loop that is not active, or in
 * a Project/Area that is done or on hold (domain/agreementReview.ts) -
 * grouped by the file they live in, frozen when the step is entered. Two
 * lines a row: ◇ the agreement; why it is listed.
 *
 * Right: the agreement with **Keep** (the valid-till choices: none · +1 m ·
 * +3 m · end of year), **Change** (Quick Add's agreement form in the column:
 * + Add ends the old one and adds the new one) and **End** (asks once).
 * Rows acted on stay listed with a checkmark. Every write goes through
 * storage/agreements.ts. Hidden from the hub while it lists nothing.
 */
import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AgreementRef} from '../../../domain/agreementOwner';
import {AgreementReviewGroup, agreementReviewCount} from '../../../domain/agreementReview';
import {agreementPlainText, agreementRowDetail, reviewReasonText, VALID_PRESETS} from '../../../domain/agreementText';
import {validTillOf} from '../../../domain/agreements';
import {Destination} from '../../../domain/destination';
import {todayIso} from '../../../domain/meetingTime';
import {changeAgreement, keepAgreement} from '../../../storage/agreements';
import {agreementsToReview} from '../../../storage/reviewAggregate';
import {useEndAgreement} from '../../../ui/itemCard/useAgreementCard';
import QuickAddWidget from '../../../ui/QuickAddWidget';
import ReviewMasterDetail from '../../../ui/ReviewMasterDetail';
import {FONT, SPACING} from '../../../ui/theme';
import {useActionError} from '../../../ui/useActionError';
import {agreementRefKey} from '../../../ui/useAgreementActions';
import {log} from '../../../utils/log';
import {requestEinkRefresh} from '../../../utils/screenRefresh';
import {bump} from '../reviewVisit';
import {noopAddMeeting, ReviewEmptyDetail, ReviewStepProps} from '../shared';
import {useFrozenStepList} from '../useFrozenStepList';
import {ReviewData} from '../useReviewData';

const NAME = 'ReviewScreen.agreements';
const HEAD_HEIGHT = 30;
const ROW_HEIGHT = 57;

type AgreementRow = {kind: 'head'; key: string; label: string} | {kind: 'agreement'; key: string; text: string};

/** The live list of agreements to review, or null until settings are loaded. */
export function useAgreementReview(data: ReviewData): AgreementReviewGroup[] | null {
  const {contextItems: items, settings} = data;
  return useMemo(() => (settings ? agreementsToReview(items, settings.noteSetups, todayIso()) : null), [items, settings]);
}

/** The step's count. */
export function agreementsStepCount(groups: AgreementReviewGroup[] | null): number {
  return groups ? agreementReviewCount(groups) : 0;
}

function rowsOf(groups: AgreementReviewGroup[]): AgreementRow[] {
  return groups.flatMap(g => [
    {kind: 'head' as const, key: `h-${g.item.path}`, label: g.item.name},
    ...g.rows.map(r => ({kind: 'agreement' as const, key: agreementRefKey(r.ref), text: r.ref.agreement.text})),
  ]);
}

export default function AgreementsStep({data, stepEntryToken, onAddTask, textColor, borderColor, placeholderColor}: ReviewStepProps): React.JSX.Element {
  const groups = useAgreementReview(data);
  const source = useMemo(() => (groups ? rowsOf(groups) : null), [groups]);
  const frozen = useFrozenStepList(source, stepEntryToken);
  const live = new Map<string, {ref: AgreementRef; reasons: string[]; itemName: string}>();
  const today = todayIso();
  for (const g of groups ?? []) {
    for (const r of g.rows) live.set(agreementRefKey(r.ref), {ref: r.ref, reasons: r.reasons.map(reason => reviewReasonText(reason, r.ref.agreement, today)), itemName: g.item.name});
  }
  const [keeping, setKeeping] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const action = useActionError(`${NAME}.error`, `${NAME}: action failed`);
  const end = useEndAgreement(NAME);

  const acted = (key: string, counter: 'agreementsKept' | 'agreementsEnded') => {
    bump(counter);
    frozen.markActed(key);
    setKeeping(null);
    setChanging(null);
    data.refreshFromCache();
    requestEinkRefresh();
  };

  const renderRow = (row: AgreementRow, selected: boolean, actedOn: boolean): React.ReactNode => {
    if (row.kind === 'head') {
      return (
        <Text key={row.key} style={[styles.head, {color: textColor}]} numberOfLines={1}>
          {row.label}
        </Text>
      );
    }
    const entry = live.get(row.key);
    return (
      <View style={[styles.row, {borderColor}, selected && styles.rowSelected]}>
        <Text style={[styles.name, {color: textColor}, actedOn && styles.acted]} numberOfLines={1}>
          {actedOn ? '✓ ' : '◇ '}
          {row.text}
        </Text>
        <Text style={[styles.small, styles.dim, {color: textColor}]} numberOfLines={1}>
          {entry ? entry.reasons.join(' · ') : 'done'}
        </Text>
      </View>
    );
  };

  const renderDetail = (selectedKey: string | null): React.ReactNode => {
    const entry = selectedKey ? live.get(selectedKey) : undefined;
    if (!entry || !selectedKey) {
      return (
        <ReviewEmptyDetail
          title={selectedKey ? 'Agreement done' : 'No agreement selected'}
          text="Agreements past their date, with someone you no longer tend, of a closed loop, or in a project that is done or on hold. Keep, change or end each one."
          hint="Tap an agreement on the left to get started."
          textColor={textColor}
        />
      );
    }
    const {ref} = entry;
    const key = selectedKey;
    if (changing === key) {
      const destination: Destination = {type: 'inbox'};
      return (
        <QuickAddWidget
          layoutKey="agreementsReview"
          fixedDestination={destination}
          onAddTask={onAddTask}
          onAddMeeting={noopAddMeeting}
          editTarget={{kind: 'agreementChange', mode: 'edit', key: `agreementChange:${key}`, replaces: ref}}
          onCancelEdit={() => setChanging(null)}
          onChangeAgreement={async (text, valid) => {
            await changeAgreement(ref, text, valid, null);
            log(`${NAME}: changed`);
            acted(key, 'agreementsEnded');
            return true;
          }}
          textColor={textColor}
          borderColor={borderColor}
          placeholderColor={placeholderColor}
        />
      );
    }
    const button = (label: string, onPress: () => void) => (
      <Pressable key={label} onPress={onPress} hitSlop={8} style={[styles.button, {borderColor}]}>
        <Text style={[styles.small, styles.buttonText, {color: textColor}]}>{label}</Text>
      </Pressable>
    );
    return (
      <View style={styles.summary}>
        <Text style={[styles.title, {color: textColor}]}>◇ {agreementPlainText(ref.agreement)}</Text>
        {ref.agreement.tags.length > 0 ? <Text style={[styles.small, {color: textColor}]}>{ref.agreement.tags.map(t => `#${t}`).join('  ')}</Text> : null}
        <Text style={[styles.small, {color: textColor}]}>{agreementRowDetail(ref.agreement, today)}</Text>
        <Text style={[styles.small, styles.flag, {color: textColor}]}>{entry.reasons.join(' · ')}</Text>
        <Text style={[styles.small, {color: textColor}]}>{`in ${entry.itemName}`}</Text>
        <View style={styles.actions}>
          {button('Keep', () => setKeeping(keeping === key ? null : key))}
          {button('Change', () => setChanging(key))}
          {button('End', () =>
            end(ref).then(ended => {
              if (ended) acted(key, 'agreementsEnded');
            }),
          )}
        </View>
        {keeping === key ? (
          <View style={styles.actions}>
            {VALID_PRESETS.map(({preset, label}) =>
              button(label, () =>
                action.run(async () => {
                  await keepAgreement(ref, validTillOf(preset, today));
                  log(`${NAME}: kept`, preset);
                  acted(key, 'agreementsKept');
                }),
              ),
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ReviewMasterDetail<AgreementRow>
      header="Agreements"
      rows={frozen.list ?? []}
      rowHeight={row => (row.kind === 'head' ? HEAD_HEIGHT : ROW_HEIGHT)}
      isSelectable={row => row.kind === 'agreement'}
      isCountableRow={row => row.kind === 'agreement'}
      rowKey={row => row.key}
      renderRow={renderRow}
      renderDetail={renderDetail}
      actedOnKeys={frozen.actedOn}
      resetKey={stepEntryToken}
      emptyHint="No agreements need a decision."
      textColor={textColor}
      borderColor={borderColor}
    />
  );
}

const styles = StyleSheet.create({
  head: {fontSize: FONT.small, fontWeight: '600', opacity: 0.6, height: HEAD_HEIGHT, paddingTop: 10},
  row: {height: ROW_HEIGHT, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: SPACING.xs},
  rowSelected: {borderLeftWidth: 4},
  name: {fontSize: FONT.medium, fontWeight: '600'},
  acted: {opacity: 0.6},
  small: {fontSize: FONT.small},
  dim: {opacity: 0.7},
  flag: {fontWeight: '700'},
  summary: {gap: 4},
  title: {fontSize: FONT.large, fontWeight: '700'},
  actions: {flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm, gap: SPACING.sm},
  button: {borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4},
  buttonText: {fontWeight: '600'},
});
