/**
 * The meeting card (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.6, C1): in Quick Add's place after one tap on a meeting, one page in the
 * same four rows.
 *   R1 Meeting · <owner ›> · <phase>, + Meeting, ✕
 *   R2 the title (a tap edits) and its time
 *   R3 P / R · M · F · Reflect (once over), the thread on the right
 *   R4 Note › / + Note · 📎 · ↪ refile · + Next (New from this) · ⊘ Cancel
 *      meeting (before it starts; asks once in the status slot)
 * Every button acts at once; what shows is decided in domain/itemCard.ts.
 */
import React from 'react';
import {Text, View} from 'react-native';
import {MeetingCardButton, meetingCardLayout} from '../../domain/itemCard';
import {CancelMeetingIcon, NewFromThisIcon, ReflectIcon, RefileIcon} from './icons';
import {cardStyles, CardRow1, DetailLine, FileSlot, letter, SquareButton, TextButton} from './parts';
import {useCardCommitTrace} from './useCardCommitTrace';
import {usePerfRender} from '../../utils/perf';
import {MeetingCardData} from './useMeetingCard';

interface Props {
  card: MeetingCardData;
  /** Fills the Meeting create draft from this meeting and closes the card (QuickAddWidget). */
  onNewFromThis: () => void;
  /** `+ Meeting`: the next meeting for the same place (QuickAddWidget). */
  onNewMeeting?: () => void;
  textColor: string;
  borderColor: string;
}

export default function MeetingCard({card, onNewFromThis, onNewMeeting, textColor, borderColor}: Props): React.JSX.Element {
  usePerfRender('MeetingCard');
  useCardCommitTrace('meeting');
  const {model, busy} = card;
  const colors = {textColor, borderColor};
  const layout = meetingCardLayout(model);

  const button = (kind: MeetingCardButton): React.ReactNode => {
    switch (kind) {
      case 'checkpoint':
        return model.checkpoint ? (
          <SquareButton key={kind} label={model.checkpoint.kind === 'prep' ? 'Prepped' : 'Reviewed'} on={model.checkpoint.done} onPress={card.onCheckpoint} {...colors}>
            {letter(model.checkpoint.label)}
          </SquareButton>
        ) : null;
      case 'note':
        return (
          <TextButton
            key={kind}
            label={model.note === 'open' ? 'Open note' : model.note === 'home' ? 'Home notebook' : 'Create note'}
            text={model.note === 'create' ? '+ Note' : 'Note ›'}
            onPress={card.onNote}
            {...colors}
          />
        );
      case 'reflect':
        return (
          <SquareButton
            key={kind}
            label={model.reflection === 'exists' ? 'Reflection' : 'Reflect'}
            on={model.reflection === 'exists'}
            disabled={model.reflection === 'unknown' || busy}
            onPress={card.onReflect}
            {...colors}>
            {color => <ReflectIcon color={color} />}
          </SquareButton>
        );
      case 'monthly':
        return (
          <SquareButton key={kind} label="Month highlight" on={model.monthly} onPress={card.onMonthly} {...colors}>
            {letter('M')}
          </SquareButton>
        );
      case 'focus':
        return card.onFocusBlock ? (
          <SquareButton key={kind} label="Focus block" on={model.focusBlock} onPress={card.onFocusBlock} {...colors}>
            {letter('F')}
          </SquareButton>
        ) : null;
      case 'refile':
        return (
          <SquareButton key={kind} label="Refile" onPress={card.onRefile} {...colors}>
            {color => <RefileIcon size={18} color={color} />}
          </SquareButton>
        );
      case 'file':
        return <FileSlot key={kind} file={model.file} onOpen={card.onOpenFile} onUnlink={card.onUnlink} onLink={card.onLink} {...colors} />;
      case 'newFromThis':
        return (
          <SquareButton key={kind} label="New from this" onPress={onNewFromThis} {...colors}>
            {color => <NewFromThisIcon color={color} />}
          </SquareButton>
        );
      case 'cancel':
        return (
          <SquareButton key={kind} label="Cancel meeting" onPress={card.onCancelMeeting} {...colors}>
            {color => <CancelMeetingIcon color={color} />}
          </SquareButton>
        );
    }
  };

  const thread = model.thread ? <DetailLine text={model.thread.label} onPress={card.onOpenThread} {...colors} /> : null;

  return (
    <View>
      <CardRow1
        heading={model.kind}
        link={{label: card.onOpenOwner ? `${model.owner.name} ›` : model.owner.name, onPress: card.onOpenOwner}}
        status={`· ${model.status}`}
        next={onNewMeeting ? {label: '+ Meeting', onPress: onNewMeeting} : null}
        onClose={card.onClose}
        {...colors}
      />

      <View style={[cardStyles.row, cardStyles.row2]}>
        <Text
          style={[cardStyles.title, {color: textColor}, model.phase === 'cancelled' && cardStyles.struck]}
          numberOfLines={1}
          onPress={card.onEdit}
          accessibilityRole="button"
          accessibilityHint="Edit">
          {model.title}
        </Text>
        <View style={cardStyles.spacer} />
        <Text style={[cardStyles.small, {color: textColor}]} numberOfLines={1}>
          {model.when}
        </Text>
      </View>

      <View style={[cardStyles.row, cardStyles.row3]}>
        {layout.row3.map(button)}
        <View style={cardStyles.spacer} />
        {thread}
      </View>

      <View style={[cardStyles.row, cardStyles.row4]}>{layout.row4.map(button)}</View>
    </View>
  );
}
