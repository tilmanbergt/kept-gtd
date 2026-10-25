/**
 * Which section the note page belongs to
 * (docs/dev/history/technical-design-engage-page-owner.md §3.8, P9): one
 * quiet line directly under the header - the section's title, and "from p. N"
 * when the section starts on an earlier page. Not tappable; one line.
 */
import React from 'react';
import {Text} from 'react-native';
import {sectionLineText} from '../../domain/engageText';
import {SectionInfo} from '../../domain/pageSection';
import {engageStyles as styles} from './engageStyles';

interface Props {
  section: SectionInfo;
  textColor: string;
}

export default function SectionLine({section, textColor}: Props): React.JSX.Element {
  return (
    <Text style={[styles.sectionLine, {color: textColor}]} numberOfLines={1} testID="section-line">
      {sectionLineText(section.title, section.page, section.distance)}
    </Text>
  );
}
