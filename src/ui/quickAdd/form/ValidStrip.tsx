/**
 * The valid-till presets of the agreement form over row 2
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.2): none · +1 m ·
 * +3 m · end of year · … · ✕. A preset sets the date; `…` turns the field into
 * a date field for any other day. Mounted, hidden while closed.
 */
import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {StripHideButton} from '../../ClipboardStrip';
import {common} from '../../commonStyles';
import {stripStyles} from './stripStyles';
import {useUnblocked} from './StripHost';

interface Props {
  visible: boolean;
  presets: ReadonlyArray<{label: string; value: string | null}>;
  onPick: (valid: string | null) => void;
  onType: () => void;
  onClose: () => void;
  textColor: string;
  borderColor: string;
}

export default function ValidStrip({visible, presets, onPick, onType, onClose, textColor, borderColor}: Props): React.JSX.Element {
  const shown = useUnblocked(visible);
  return (
    <View style={[stripStyles.overRow2, {borderColor}, !shown && stripStyles.hidden]}>
      <View style={stripStyles.body}>
        {presets.map(p => (
          <Pressable key={p.label} style={[common.floatingStripButton, {borderColor}]} onPress={() => onPick(p.value)} hitSlop={6}>
            <Text style={[common.floatingStripButtonText, {color: textColor}]}>{p.label}</Text>
          </Pressable>
        ))}
        <Pressable style={[common.floatingStripButton, {borderColor}]} onPress={onType} hitSlop={6} accessibilityLabel="Other day">
          <Text style={[common.floatingStripButtonText, {color: textColor}]}>…</Text>
        </Pressable>
      </View>
      <StripHideButton onPress={onClose} textColor={textColor} />
    </View>
  );
}
