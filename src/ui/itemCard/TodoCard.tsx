/**
 * The todo card (docs/dev/history/technical-design-calmer-screens.md §3.4,
 * docs/dev/history/technical-design-item-card.md K9): in Quick Add's place
 * after one tap on a todo, in the same four rows.
 *   R1 "Todo · <owner> · <due / flow>", ✕
 *   R2 the title (a tap edits)
 *   R3 one detail line: where it was agreed (opens the thread), the linked
 *      file (opens it), or "no note yet"
 *   R4 ✓ Done · w/f · Someday · Note › / + Note · More ›
 * More › swaps R3-R4 for the rest - Next · Maybe · Edit · <owner> ›, then
 * refile, the linked file or +clip, delete and ‹ - in the same box.
 * Every button acts at once; what shows is decided in domain/itemCard.ts.
 */
import React, {useState} from 'react';
import {Text, View} from 'react-native';
import {CardPage, TodoCardButton, todoCardPage} from '../../domain/itemCard';
import {TrashIcon} from '../icons';
import {RefileIcon} from './icons';
import {cardStyles, CardRow1, DetailLine, FileSlot, SquareButton, TextButton} from './parts';
import {useCardCommitTrace} from './useCardCommitTrace';
import {TodoCardData} from './useTodoCard';

interface Props {
  card: TodoCardData;
  textColor: string;
  borderColor: string;
}

export default function TodoCard({card, textColor, borderColor}: Props): React.JSX.Element {
  useCardCommitTrace('todo');
  const {model} = card;
  const colors = {textColor, borderColor};
  const [page, setPage] = useState<CardPage>('main');
  const layout = todoCardPage(model, page);
  const flow = model.flowState;

  const button = (kind: TodoCardButton): React.ReactNode => {
    switch (kind) {
      case 'done':
        return <TextButton key={kind} label="Done" text={model.done ? '✓ Done' : '☐ Done'} on={model.done} onPress={card.onToggleDone} {...colors} />;
      case 'waiting':
        return <TextButton key={kind} label="w/f" on={flow === 'waiting-for'} onPress={() => card.onFlow('waiting-for')} {...colors} />;
      case 'someday':
        return <TextButton key={kind} label="Someday" on={flow === 'someday'} onPress={() => card.onFlow('someday')} {...colors} />;
      case 'next':
        return <TextButton key={kind} label="Next" on={flow === 'next'} onPress={() => card.onFlow('next')} {...colors} />;
      case 'maybe':
        return <TextButton key={kind} label="Maybe" on={flow === 'maybe'} onPress={() => card.onFlow('maybe')} {...colors} />;
      case 'note':
        return <TextButton key={kind} label={model.note === 'open' ? 'Open note' : 'Create note'} text={model.note === 'open' ? 'Note ›' : '+ Note'} onPress={card.onNote} {...colors} />;
      case 'more':
        return <TextButton key={kind} label="More" text="More ›" onPress={() => setPage('more')} {...colors} />;
      case 'back':
        return <TextButton key={kind} label="Back" text="‹" onPress={() => setPage('main')} {...colors} />;
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
      case 'delete':
        return (
          <SquareButton key={kind} label="Delete" onPress={card.onDelete} {...colors}>
            {color => <TrashIcon size={18} color={color} />}
          </SquareButton>
        );
    }
  };

  const detail = model.detail;
  const detailLine =
    detail?.kind === 'origin' ? (
      <DetailLine text={detail.label} onPress={card.onOpenOrigin} {...colors} />
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
          style={[cardStyles.title, {color: textColor}, (model.done || !model.canDelete) && cardStyles.struck]}
          numberOfLines={1}
          onPress={card.onEdit}
          accessibilityRole="button"
          accessibilityHint="Edit">
          {model.title}
        </Text>
      </View>

      <View style={[cardStyles.row, cardStyles.row3]}>{layout.detail ? detailLine : layout.row3.map(button)}</View>

      <View style={[cardStyles.row, cardStyles.row4]}>{layout.row4.map(button)}</View>
    </View>
  );
}
