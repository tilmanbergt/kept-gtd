/**
 * The date and time strips of Quick Add's form
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.2, D2): over
 * the field's second line, full width, ending in ✕. Two views - ± Adjust
 * (the steps of domain/writing/whenSteps.ts, a step that can't act greyed)
 * and ⚡ Suggest (the usual slot or weekday); the square that switches shows
 * only when the other view has something.
 *
 * The left slot shows one thing: the moment of the field's writing help
 * (read as … · Undo, or two readings to choose from), else the warning in
 * its short form, else what the value means (length, start, days, the full
 * date). Information only - nothing here moves or saves a meeting.
 *
 * Always mounted, hidden with `display: 'none'` (a tap on it must survive
 * the field's blur on touch-down, as with every hovering strip).
 */
import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {StripContent} from '../../../domain/writing/stripContent';
import {applyDateStep, applyTimeStep, dateSteps, DateStepId, Step, StepId, timeSteps, TimeStepId} from '../../../domain/writing/whenSteps';
import {log} from '../../../utils/log';
import {StripHideButton, useStripHide} from '../../ClipboardStrip';
import {common} from '../../commonStyles';
import {WritingStripActions} from '../../writing/useWritingHelp';
import {stripStyles} from './stripStyles';
import {useUnblocked} from './StripHost';

export type WhenView = 'adjust' | 'suggest';

interface Props {
  visible: boolean;
  field: 'date' | 'time';
  value: string;
  /** The field's writing help: its moment (read, choice) leads the strip. */
  content: StripContent;
  actions: WritingStripActions;
  /** The warning's short form (`⚠ past`), or null. */
  warning: string | null;
  /** The Suggest view's one button (`usual Thu 15:00–16:30`), or null for none. */
  suggestLabel: string | null;
  onSuggest?: () => void;
  /** Writes the field's new text after a step. */
  onChange: (next: string) => void;
  /** Below 800 dp: the short step labels (§3.9). */
  narrow: boolean;
  /** `overRow2` (Quick Add's form, the default) or `above` the field (the capture panel). */
  placement?: 'overRow2' | 'above';
  textColor: string;
  borderColor: string;
}

/** The view a strip opens in: Suggest for an empty field that has a suggestion, else Adjust. */
export function startView(value: string, suggestLabel: string | null): WhenView {
  return !value.trim() && suggestLabel ? 'suggest' : 'adjust';
}

export default function WhenStrip(props: Props): React.JSX.Element {
  const {visible, field, value, content, actions, warning, suggestLabel, onSuggest, onChange, narrow, placement = 'overRow2', textColor, borderColor} = props;
  // A confirm, modal or error in the status slot hides the strip (D3).
  const {shown, hide} = useStripHide(useUnblocked(visible));
  const [view, setView] = useState<WhenView>(() => startView(value, suggestLabel));
  // Each time the strip shows it opens in the view that fits the field then.
  const [wasShown, setWasShown] = useState(shown);
  if (shown !== wasShown) {
    setWasShown(shown);
    if (shown) {
      const next = startView(value, suggestLabel);
      setView(next);
      log(`QuickAdd: strip view=${next === 'suggest' ? 'when-suggest' : 'adjust'} field=${field}`);
    }
  }
  const steps = field === 'time' ? timeSteps(value, narrow) : dateSteps(value);
  const lead = (text: string) => (
    <Text key="lead" style={[common.floatingStripButtonText, stripStyles.lead, {color: textColor}]} numberOfLines={1}>
      {text}
    </Text>
  );
  const button = (key: string, label: string, onPress: () => void, enabled = true) => (
    <Pressable
      key={key}
      style={[common.floatingStripButton, {borderColor}, !enabled && stripStyles.off]}
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      hitSlop={6}
      accessibilityState={{disabled: !enabled}}>
      <Text style={[common.floatingStripButtonText, {color: textColor}]}>{label}</Text>
    </Pressable>
  );
  const onStep = (step: Step<StepId>) => {
    log(`QuickAdd: strip step id=${step.id}`);
    onChange(field === 'time' ? applyTimeStep(value, step.id as TimeStepId) : applyDateStep(value, step.id as DateStepId));
  };

  const body: React.ReactNode[] = [];
  if (content.kind === 'read') body.push(lead(content.label), button('undo', 'Undo', actions.undo));
  else if (content.kind === 'choice') body.push(lead('Did you mean'), ...content.options.map(o => button(`choice:${o.value}`, o.label, () => actions.choose(o.value))));
  else {
    const info = warning ?? steps.info;
    if (info) body.push(lead(info));
  }
  const adjustHas = steps.steps.length > 0;
  const suggestHas = !!suggestLabel && !!onSuggest;
  const showing: WhenView = view === 'suggest' && !suggestHas ? 'adjust' : view === 'adjust' && !adjustHas && suggestHas ? 'suggest' : view;
  if (showing === 'adjust') body.push(...steps.steps.map(s => button(s.id, s.label, () => onStep(s), s.enabled)));
  else if (suggestLabel && onSuggest) body.push(button('usual', suggestLabel, onSuggest));
  const other = showing === 'adjust' ? suggestHas : adjustHas;
  const empty = body.length === 0;
  return (
    <View style={[placement === 'above' ? stripStyles.aboveField : stripStyles.overRow2, {borderColor}, (!shown || empty) && stripStyles.hidden]}>
      <View style={stripStyles.body}>{body}</View>
      {other ? (
        <Pressable
          style={[common.floatingStripButton, {borderColor}]}
          onPress={() => {
            const next = showing === 'adjust' ? 'suggest' : 'adjust';
            log(`QuickAdd: strip view=${next === 'suggest' ? 'when-suggest' : 'adjust'} field=${field}`);
            setView(next);
          }}
          hitSlop={6}
          accessibilityLabel={showing === 'adjust' ? 'Suggest' : 'Adjust'}>
          <Text style={[common.floatingStripButtonText, {color: textColor}]}>{showing === 'adjust' ? '⚡' : '±'}</Text>
        </Pressable>
      ) : null}
      <StripHideButton onPress={hide} textColor={textColor} />
    </View>
  );
}

