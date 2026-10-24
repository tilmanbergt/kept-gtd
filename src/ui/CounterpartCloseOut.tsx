/**
 * Close-out when a counterpart is set inactive
 * (docs/dev/history/technical-design-tending-threads.md §3.9.3, decision D19):
 * its open todos inside the scope, in the overview's three groups (I owe,
 * Waiting for, Relevant - the counterpart lens), each with Done / Cancel /
 * Keep (Keep is the default). "Set inactive" applies the choices through
 * storage/itemMove.ts's closeTask, then writes the status line through
 * storage/counterparts.ts. Used by the Threads tab and Review's "Tending
 * threads" step, drawn in place of the panel it was started from.
 *
 * Its active agreements follow as a group "Agreements"
 * (docs/dev/history/technical-design-meetings-0.21.md R26): Keep (the
 * default) or End each, or End all; ended through storage/agreements.ts.
 *
 * With no open todos and no active agreements there is nothing to close out:
 * `useSetInactive` asks one confirmation in the status slot instead and
 * writes the line.
 */
import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AgreementRef} from '../domain/agreementOwner';
import {displayTaskText} from '../domain/taskLabels';
import {endAgreement} from '../storage/agreements';
import {setCounterpartStatus} from '../storage/counterparts';
import {closeTask} from '../storage/itemMove';
import {RosterEntry} from '../storage/tendingRoster';
import {ThreadOverview, ThreadTaskEntry} from '../storage/threadAggregate';
import {log} from '../utils/log';
import {requestEinkRefresh} from '../utils/screenRefresh';
import PagedSection from './PagedSection';
import PillButton from './PillButton';
import {FONT, SPACING} from './theme';
import {useActionError} from './useActionError';
import {useStatusConfirm} from './useStatusConfirm';

type Choice = 'done' | 'cancel' | 'keep';

// Someday/Maybe is its own list in the overview, but a close-out still covers it.
const GROUPS: Array<{key: 'owe' | 'waiting' | 'relevant' | 'someday'; label: string}> = [
  {key: 'owe', label: 'I owe'},
  {key: 'waiting', label: 'Waiting for'},
  {key: 'relevant', label: 'Relevant'},
  {key: 'someday', label: 'Someday / Maybe'},
];

const HEAD_HEIGHT = 30;
const ROW_HEIGHT = 44;

type CloseOutRow =
  | {kind: 'head'; key: string; label: string; endAll?: boolean}
  | {kind: 'todo'; key: string; entry: ThreadTaskEntry}
  | {kind: 'agreement'; key: string; ref: AgreementRef};

const keyOf = (e: ThreadTaskEntry) => `${e.item.path}#${e.taskIndex}`;
const agreementKeyOf = (r: AgreementRef) => `a:${r.itemPath}#${r.index}`;

/** The open todos a close-out offers (the overview's I owe, Waiting for, Relevant and Someday/Maybe; never Inbox entries). */
export function closeOutTodos(overview: ThreadOverview): ThreadTaskEntry[] {
  return GROUPS.flatMap(g => overview.ahead[g.key]).filter(e => e.item.kind !== 'inbox');
}

/**
 * "Set inactive": a confirmation when nothing is open (resolves 'done'), else
 * 'closeOut' - the caller then shows CounterpartCloseOut.
 */
export function useSetInactive(statusName: string, onSet?: (entry: RosterEntry) => void): (entry: RosterEntry) => Promise<'done' | 'closeOut' | 'cancelled'> {
  const confirm = useStatusConfirm(`${statusName}.confirm`);
  const action = useActionError(statusName, 'CounterpartCloseOut: set inactive failed');
  return useCallback(
    async (entry: RosterEntry) => {
      if (closeOutTodos(entry.overview).length > 0 || entry.overview.ahead.agreements.length > 0) return 'closeOut';
      const leaf = entry.counterpart.leaf;
      const ok = await confirm({
        text: `Set ${leaf} inactive? Nothing is open.`,
        detail: `${leaf} leaves the Review and the tag suggestions; its overview keeps working. The line goes into ${entry.owner.name}.`,
        actionLabel: 'Set inactive',
      });
      if (!ok) return 'cancelled';
      let written = false;
      await action.run(async () => {
        await setCounterpartStatus(entry.owner.path, leaf, 'inactive');
        written = true;
      });
      if (!written) return 'cancelled';
      onSet?.(entry);
      requestEinkRefresh();
      return 'done';
    },
    [confirm, action, onSet],
  );
}

interface Props {
  entry: RosterEntry;
  /** After "Set inactive" was applied (true) or on Back (false). */
  onClose: (applied: boolean) => void;
  viewportHeight?: number;
  textColor: string;
  borderColor: string;
}

export default function CounterpartCloseOut({entry, onClose, viewportHeight, textColor, borderColor}: Props): React.JSX.Element {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [agreementEnds, setAgreementEnds] = useState<Record<string, boolean>>({});
  const agreements = entry.overview.ahead.agreements;
  const [busy, setBusy] = useState(false);
  const action = useActionError('CounterpartCloseOut.error', 'CounterpartCloseOut: apply failed');
  const leaf = entry.counterpart.leaf;

  const rows: CloseOutRow[] = GROUPS.flatMap(group => {
    const entries = entry.overview.ahead[group.key].filter(e => e.item.kind !== 'inbox');
    if (entries.length === 0) return [];
    return [
      {kind: 'head' as const, key: `h-${group.key}`, label: group.label},
      ...entries.map(e => ({kind: 'todo' as const, key: keyOf(e), entry: e})),
    ];
  });
  if (agreements.length > 0) {
    rows.push({kind: 'head', key: 'h-agreements', label: 'Agreements', endAll: true});
    agreements.forEach(ref => rows.push({kind: 'agreement', key: agreementKeyOf(ref), ref}));
  }
  const endAll = () => setAgreementEnds(Object.fromEntries(agreements.map(ref => [agreementKeyOf(ref), true])));

  const apply = () => {
    setBusy(true);
    action
      .runSave(async () => {
        let done = 0;
        let cancelled = 0;
        for (const todo of closeOutTodos(entry.overview)) {
          const choice = choices[keyOf(todo)] ?? 'keep';
          if (choice === 'keep') continue;
          await closeTask(todo.item.path, todo.taskIndex, choice === 'done' ? 'done' : 'cancelled');
          if (choice === 'done') done += 1;
          else cancelled += 1;
        }
        let ended = 0;
        for (const ref of agreements) {
          if (!agreementEnds[agreementKeyOf(ref)]) continue;
          await endAgreement(ref);
          ended += 1;
        }
        await setCounterpartStatus(entry.owner.path, leaf, 'inactive');
        log('CounterpartCloseOut: applied', `${done} done`, `${cancelled} cancelled`, `${ended} agreements ended`);
      })
      .then(ok => {
        setBusy(false);
        if (ok) {
          requestEinkRefresh();
          onClose(true);
        }
      });
  };

  return (
    <View style={styles.root}>
      <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
        Set {leaf} inactive
      </Text>
      <Text style={[styles.hint, {color: textColor}]} numberOfLines={2}>
        Close out its open todos and agreements first: Done, Cancel or Keep each todo; Keep or End each agreement.
      </Text>
      <View style={styles.actions}>
        <PillButton label="Set inactive" primary disabled={busy} onPress={apply} textColor={textColor} borderColor={borderColor} />
        <PillButton label="Back" disabled={busy} onPress={() => onClose(false)} textColor={textColor} borderColor={borderColor} />
      </View>
      <View style={viewportHeight === undefined ? styles.fill : undefined}>
        <PagedSection
          header={agreements.length > 0 ? 'Open todos and agreements' : 'Open todos'}
          rows={rows}
          rowHeight={row => (row.kind === 'head' ? HEAD_HEIGHT : ROW_HEIGHT)}
          isCountableRow={row => row.kind !== 'head'}
          viewportHeight={viewportHeight}
          resetKey={`${entry.owner.path}|${leaf}`}
          renderRow={row =>
            row.kind === 'head' ? (
              <Text key={row.key} style={[styles.head, {color: textColor}]}>
                {row.label}
                {row.endAll ? (
                  <Text onPress={endAll} suppressHighlighting style={styles.endAll}>
                    {'   End all'}
                  </Text>
                ) : null}
              </Text>
            ) : row.kind === 'agreement' ? (
              <View key={row.key} style={[styles.row, {borderColor}]}>
                <Text style={[styles.todo, {color: textColor}]} numberOfLines={1}>
                  ◇ {row.ref.agreement.text}
                </Text>
                {(['keep', 'end'] as const).map(choice => {
                  const selected = (agreementEnds[row.key] ? 'end' : 'keep') === choice;
                  return (
                    <Text
                      key={choice}
                      onPress={() => setAgreementEnds(prev => ({...prev, [row.key]: choice === 'end'}))}
                      suppressHighlighting
                      style={[styles.choice, {color: textColor}, selected ? [styles.choiceSelected, {borderColor: textColor}] : styles.choiceUnselected]}>
                      {choice === 'end' ? 'End' : 'Keep'}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <View key={row.key} style={[styles.row, {borderColor}]}>
                <Text style={[styles.todo, {color: textColor}]} numberOfLines={1}>
                  {displayTaskText(row.entry.task, 'grouped')}
                </Text>
                {(['done', 'cancel', 'keep'] as Choice[]).map(choice => {
                  const selected = (choices[row.key] ?? 'keep') === choice;
                  return (
                    <Text
                      key={choice}
                      onPress={() => setChoices(prev => ({...prev, [row.key]: choice}))}
                      suppressHighlighting
                      style={[styles.choice, {color: textColor}, selected ? [styles.choiceSelected, {borderColor: textColor}] : styles.choiceUnselected]}>
                      {choice === 'done' ? 'Done' : choice === 'cancel' ? 'Cancel' : 'Keep'}
                    </Text>
                  );
                })}
              </View>
            )
          }
          textColor={textColor}
          borderColor={borderColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  fill: {flex: 1},
  title: {fontSize: FONT.medium, fontWeight: '700'},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: SPACING.xs, marginBottom: SPACING.sm},
  actions: {flexDirection: 'row', marginBottom: SPACING.sm},
  head: {fontSize: FONT.small, fontWeight: '600', opacity: 0.6, height: HEAD_HEIGHT, paddingTop: 10},
  row: {height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth},
  todo: {flex: 1, fontSize: FONT.medium, marginRight: SPACING.sm},
  choice: {fontSize: FONT.small, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 4},
  choiceSelected: {fontWeight: '700'},
  choiceUnselected: {borderColor: 'transparent'},
  endAll: {fontWeight: '700', textDecorationLine: 'underline', opacity: 1},
});
