/**
 * The meeting card (docs/dev/history/technical-design-calmer-screens.md §3.4,
 * docs/dev/history/technical-design-item-card.md K8): in Quick Add's place
 * after one tap on a meeting, in the same four rows at the same heights
 * (ui/quickAdd/QuickAddFrame.tsx), so nothing below moves.
 *   R1 "Meeting · <owner> · <phase>", ✕
 *   R2 title (a tap edits) and when
 *   R3 one detail line: the thread (opens its overview), the linked file, or
 *      "no note yet"
 *   R4 P/R, the note, Reflect (once over), M, More ›
 * More › swaps R3-R4 for the rest - F · Edit · <owner> ›, then refile, the
 * linked file or +clip, New from this, Cancel meeting and ‹ - in the same box.
 * A focus block has no P/R and no Reflect; its note may be the home notebook.
 * Every button acts at once; what shows is decided in domain/itemCard.ts.
 */
import React, {useState} from 'react';
import {Text, View} from 'react-native';
import {CardPage, MeetingCardButton, meetingCardPage} from '../../domain/itemCard';
import {CancelMeetingIcon, NewFromThisIcon, ReflectIcon, RefileIcon} from './icons';
import {cardStyles, CardRow1, DetailLine, FileSlot, letter, SquareButton, TextButton} from './parts';
import {useCardCommitTrace} from './useCardCommitTrace';
import {MeetingCardData} from './useMeetingCard';

interface Props {
  card: MeetingCardData;
  /** Fills the Meeting create draft from this meeting and closes the card (QuickAddWidget). */
  onNewFromThis: () => void;
  textColor: string;
  borderColor: string;
}

export default function MeetingCard({card, onNewFromThis, textColor, borderColor}: Props): React.JSX.Element {
  useCardCommitTrace('meeting');
  const {model, busy} = card;
  const colors = {textColor, borderColor};
  const [page, setPage] = useState<CardPage>('main');
  const layout = meetingCardPage(model, page);

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
      case 'more':
        return <TextButton key={kind} label="More" text="More ›" onPress={() => setPage('more')} {...colors} />;
      case 'back':
        return <TextButton key={kind} label="Back" text="‹" onPress={() => setPage('main')} {...colors} />;
      case 'focus':
        return card.onFocusBlock ? (
          <SquareButton key={kind} label="Focus block" on={model.focusBlock} onPress={card.onFocusBlock} {...colors}>
            {letter('F')}
          </SquareButton>
        ) : null;
      case 'edit':
        return <TextButton key={kind} label="Edit" onPress={card.onEdit} {...colors} />;
      case 'owner':
        return <TextButton key={kind} label={`Open ${model.owner.name}`} text={card.onOpenOwner ? `${model.owner.name} ›` : model.owner.name} onPress={card.onOpenOwner} shrink {...colors} />;
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

  const detail = model.detail;
  const detailLine =
    detail?.kind === 'thread' ? (
      <DetailLine text={detail.label} onPress={card.onOpenThread} {...colors} />
    ) : detail?.kind === 'file' ? (
      <DetailLine text={detail.name} onPress={card.onOpenFile} {...colors} />
    ) : detail?.kind === 'noNote' ? (
      <DetailLine text="no note yet" {...colors} />
    ) : null;

  return (
    <View>
      <CardRow1 heading={model.caption} onClose={card.onClose} {...colors} />

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

      <View style={[cardStyles.row, cardStyles.row3]}>{layout.detail ? detailLine : layout.row3.map(button)}</View>

      <View style={[cardStyles.row, cardStyles.row4]}>{layout.row4.map(button)}</View>
    </View>
  );
}
