/**
 * The todo card (docs/dev/history/technical-design-quickadd-redesign.md §3.6,
 * C1, §11 G9): in Quick Add's place after one tap on a todo, one page in the
 * same height.
 *   R1    Todo · <place ›> ↪ · <flow · due>, + Todo, ✕
 *   R2-R3 the text over two lines (a tap edits), the origin at its foot
 *   R4    the done box, Next · w/f · Someday · Maybe (a tap on the filled one
 *         clears it; Sd · Mb when narrow), then the notebook, the clip and the
 *         trash (asks once)
 * Every button acts at once; what shows is decided in domain/itemCard.ts.
 */
import React from 'react';
import {View} from 'react-native';
import {TodoCardButton, todoCardLayout} from '../../domain/itemCard';
import {TrashIcon} from '../icons';
import {useLayoutClass} from '../ScreenSize';
import {cardStyles, CardRow1, ClipSquare, DetailLine, DoneBox, NoteSquare, SquareButton, TextButton, TitleArea} from './parts';
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
  const narrow = useLayoutClass() === 'narrow';
  const {model} = card;
  const colors = {textColor, borderColor};
  const layout = todoCardLayout(model);
  const flow = model.flowState;

  const button = (kind: TodoCardButton): React.ReactNode => {
    switch (kind) {
      case 'done':
        return <DoneBox key={kind} done={model.done} onPress={card.onToggleDone} {...colors} />;
      case 'next':
        return <TextButton key={kind} label="Next" on={flow === 'next'} onPress={() => card.onFlow('next')} {...colors} />;
      case 'waiting':
        return <TextButton key={kind} label="w/f" on={flow === 'waiting-for'} onPress={() => card.onFlow('waiting-for')} {...colors} />;
      case 'someday':
        return <TextButton key={kind} label="Someday" text={narrow ? 'Sd' : undefined} on={flow === 'someday'} onPress={() => card.onFlow('someday')} {...colors} />;
      case 'maybe':
        return <TextButton key={kind} label="Maybe" text={narrow ? 'Mb' : undefined} on={flow === 'maybe'} onPress={() => card.onFlow('maybe')} {...colors} />;
      case 'note':
        return <NoteSquare key={kind} note={model.note} onPress={card.onNote} {...colors} />;
      case 'file':
        return <ClipSquare key={kind} file={model.file} onOpen={card.onOpenFile} onLink={card.onLink} {...colors} />;
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
        link={{label: card.onOpenOwner ? `${model.place} ›` : model.place, onPress: card.onOpenOwner}}
        onRefile={model.owner.canRefile ? card.onRefile : undefined}
        status={`· ${model.status}`}
        next={onNewTodo ? {label: '+ Todo', onPress: onNewTodo} : null}
        onClose={card.onClose}
        {...colors}
      />
      <TitleArea title={model.title} struck={model.done || !model.canDelete} onEdit={card.onEdit} foot={origin} {...colors} />
      <View style={[cardStyles.row, cardStyles.row4]}>
        {layout.row4Left.map(button)}
        <View style={cardStyles.spacer} />
        {layout.row4Right.map(button)}
      </View>
    </View>
  );
}
