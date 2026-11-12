/**
 * The todo card (docs/dev/history/technical-design-quickadd-redesign.md §3.6,
 * C1): in Quick Add's place after one tap on a todo, one page in the same four
 * rows.
 *   R1 Todo · <owner ›> · <due / flow>, + Todo, ✕
 *   R2 the title (a tap edits)
 *   R3 Next · w/f · Someday · Maybe (a tap on the filled one clears it), the
 *      origin on the right (where it was agreed, opening the thread)
 *   R4 ☐ Done · Note › / + Note · 📎 (the linked file, or the square that
 *      starts linking) · ↪ refile · 🗑 delete (asks once)
 * Every button acts at once; what shows is decided in domain/itemCard.ts.
 */
import React from 'react';
import {Text, View} from 'react-native';
import {TodoCardButton, todoCardLayout} from '../../domain/itemCard';
import {TrashIcon} from '../icons';
import {RefileIcon} from './icons';
import {cardStyles, CardRow1, DetailLine, FileSlot, SquareButton, TextButton} from './parts';
import {useCardCommitTrace} from './useCardCommitTrace';
import {usePerfRender} from '../../utils/perf';
import {TodoCardData} from './useTodoCard';

interface Props {
  card: TodoCardData;
  /** `+ Todo`: the next todo for the same place (QuickAddWidget). */
  onNewTodo?: () => void;
  textColor: string;
  borderColor: string;
}

export default function TodoCard({card, onNewTodo, textColor, borderColor}: Props): React.JSX.Element {
  usePerfRender('TodoCard');
  useCardCommitTrace('todo');
  const {model} = card;
  const colors = {textColor, borderColor};
  const layout = todoCardLayout(model);
  const flow = model.flowState;

  const button = (kind: TodoCardButton): React.ReactNode => {
    switch (kind) {
      case 'done':
        return <TextButton key={kind} label="Done" text={model.done ? '✓ Done' : '☐ Done'} on={model.done} onPress={card.onToggleDone} {...colors} />;
      case 'next':
        return <TextButton key={kind} label="Next" on={flow === 'next'} onPress={() => card.onFlow('next')} {...colors} />;
      case 'waiting':
        return <TextButton key={kind} label="w/f" on={flow === 'waiting-for'} onPress={() => card.onFlow('waiting-for')} {...colors} />;
      case 'someday':
        return <TextButton key={kind} label="Someday" on={flow === 'someday'} onPress={() => card.onFlow('someday')} {...colors} />;
      case 'maybe':
        return <TextButton key={kind} label="Maybe" on={flow === 'maybe'} onPress={() => card.onFlow('maybe')} {...colors} />;
      case 'note':
        return <TextButton key={kind} label={model.note === 'open' ? 'Open note' : 'Create note'} text={model.note === 'open' ? 'Note ›' : '+ Note'} onPress={card.onNote} {...colors} />;
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
  const origin = detail?.kind === 'origin' ? <DetailLine text={detail.label} onPress={card.onOpenOrigin} {...colors} /> : null;

  return (
    <View>
      <CardRow1
        heading="Todo"
        link={{label: card.onOpenOwner ? `${model.owner.name} ›` : model.owner.name, onPress: card.onOpenOwner}}
        status={`· ${model.status}`}
        next={onNewTodo ? {label: '+ Todo', onPress: onNewTodo} : null}
        onClose={card.onClose}
        {...colors}
      />

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

      <View style={[cardStyles.row, cardStyles.row3]}>
        {layout.row3.map(button)}
        <View style={cardStyles.spacer} />
        {origin}
      </View>

      <View style={[cardStyles.row, cardStyles.row4]}>{layout.row4.map(button)}</View>
    </View>
  );
}
