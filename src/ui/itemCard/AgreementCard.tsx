/**
 * The agreement card (docs/dev/history/technical-design-quickadd-redesign.md
 * §3.6; docs/dev/history/technical-design-meetings-0.21.md R23): in Quick
 * Add's place after one tap on an agreement, the same four rows as the box
 * and the todo card.
 *   R1 Agreement · <owner ›> · since 14.10., ✕
 *   R2 the words and their tags - a tap opens Change (the one way to change
 *      it: a new version, the old one ends)
 *   R3 "valid till …", Change, End (an ended one shows neither)
 *   R4 where it was made, "↳ <meeting> ›"
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {quickAddButtons} from '../quickAdd/ActionRow';
import {cardStyles, CardRow1} from './parts';
import {AgreementCardData} from './useAgreementCard';
import {useCardCommitTrace} from './useCardCommitTrace';

interface Props {
  card: AgreementCardData;
  textColor: string;
  borderColor: string;
}

export default function AgreementCard({card, textColor, borderColor}: Props): React.JSX.Element {
  useCardCommitTrace('agreement');
  const colors = {textColor, borderColor};
  const button = (label: string, onPress: () => void) => (
    <Pressable style={[quickAddButtons.ghostButton, {borderColor}]} onPress={onPress} hitSlop={6} accessibilityRole="button">
      <Text style={[quickAddButtons.ghostButtonText, {color: textColor}]}>{label}</Text>
    </Pressable>
  );
  return (
    <View testID="agreement-card">
      <CardRow1
        heading="Agreement"
        link={{label: card.onOpenItem ? `${card.itemName} ›` : card.itemName, onPress: card.onOpenItem}}
        status={`· ${card.status}`}
        onClose={card.onClose}
        {...colors}
      />

      <View style={[cardStyles.row, cardStyles.row2]}>
        <Text
          style={[cardStyles.title, {color: textColor}, !card.active && cardStyles.struck]}
          numberOfLines={1}
          onPress={card.active ? card.onChange : undefined}
          accessibilityRole={card.active ? 'button' : undefined}
          accessibilityHint={card.active ? 'Change' : undefined}>
          {card.title}
        </Text>
        {card.tags.length > 0 ? (
          <Text style={[cardStyles.small, {color: textColor}]} numberOfLines={1}>
            {card.tags.join('  ')}
          </Text>
        ) : null}
      </View>

      <View style={[cardStyles.row, cardStyles.row3]}>
        <Text style={[cardStyles.small, {color: textColor}]} numberOfLines={1}>
          {card.validLine}
        </Text>
        <View style={cardStyles.spacer} />
        {card.active ? button('Change', card.onChange) : null}
        {card.active ? button('End', card.onEnd) : null}
      </View>

      <View style={[cardStyles.row, cardStyles.row4]}>
        {card.madeIn ? (
          <Pressable onPress={card.madeIn.onPress} disabled={!card.madeIn.onPress} hitSlop={6}>
            <Text style={[cardStyles.small, {color: textColor}]} numberOfLines={1}>
              {card.madeIn.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
