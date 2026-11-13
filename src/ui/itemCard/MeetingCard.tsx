/**
 * The meeting card (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.6, C1, §11 G10): in Quick Add's place after one tap on a meeting, one page in the
 * same four rows.
 *   R1    Meeting · <place ›> ↪ · <date and time> (· over / · cancelled),
 *         + Meeting, ✕; narrow without the kind word, weekday and end
 *   R2-R3 the title over two lines (a tap edits), the thread at its foot
 *   R4    P / R · M · F · Reflect (once over), then the notebook · 📎 ·
 *         New from this · ⊘ Cancel meeting (before it starts; asks once in
 *         the status slot; after the start its square stays empty)
 * Every button acts at once; what shows is decided in domain/itemCard.ts.
 */
import React from 'react';
import {View} from 'react-native';
import {MeetingCardButton, meetingCardLayout, meetingCardState} from '../../domain/itemCard';
import {useLayoutClass} from '../ScreenSize';
import {CancelMeetingIcon, NewFromThisIcon, ReflectIcon} from './icons';
import {cardStyles, CardRow1, ClipSquare, DetailLine, EmptySquare, letter, NoteSquare, SquareButton, TitleArea} from './parts';
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
  const narrow = useLayoutClass() === 'narrow';
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
        return model.note ? <NoteSquare key={kind} note={model.note} onPress={card.onNote} {...colors} /> : null;
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
      case 'file':
        return <ClipSquare key={kind} file={model.file} onOpen={card.onOpenFile} onLink={card.onLink} {...colors} />;
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
      case 'empty':
        return <EmptySquare key={kind} />;
    }
  };

  const thread = model.thread ? <DetailLine text={model.thread.label} onPress={card.onOpenThread} {...colors} /> : null;

  return (
    <View>
      <CardRow1
        heading={narrow ? '' : model.kind}
        link={{label: card.onOpenOwner ? `${model.place} ›` : model.place, onPress: card.onOpenOwner}}
        onRefile={model.owner.canRefile ? card.onRefile : undefined}
        status={`· ${meetingCardState(model, narrow)}`}
        next={onNewMeeting ? {label: '+ Meeting', onPress: onNewMeeting} : null}
        onClose={card.onClose}
        {...colors}
      />
      <TitleArea title={model.title} struck={model.phase === 'cancelled'} onEdit={card.onEdit} foot={thread} {...colors} />
      <View style={[cardStyles.row, cardStyles.row4]}>
        {layout.row4Left.map(button)}
        <View style={cardStyles.spacer} />
        {layout.row4Right.map(button)}
      </View>
    </View>
  );
}
