/**
 * One switch line of Settings → Features and Advanced: an underlined
 * "Label: ON (tap to turn off)" button with its hint below. Presentational;
 * the tab's owner stores the value at once.
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FONT} from '../../ui/theme';

export default function SettingSwitch({
  label,
  on,
  onPress,
  hint,
  textColor,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  hint: string;
  textColor: string;
}): React.JSX.Element {
  return (
    <View style={switchStyles.field}>
      <Pressable onPress={onPress} hitSlop={8} style={switchStyles.button}>
        <Text style={[switchStyles.buttonText, {color: textColor}]}>
          {label}: {on ? 'ON (tap to turn off)' : 'OFF (tap to turn on)'}
        </Text>
      </Pressable>
      <Text style={[switchStyles.hint, {color: textColor}]}>{hint}</Text>
    </View>
  );
}

export const switchStyles = StyleSheet.create({
  field: {marginBottom: 18},
  button: {alignSelf: 'flex-start'},
  buttonText: {fontSize: FONT.small, fontWeight: '600', textDecorationLine: 'underline'},
  hint: {fontSize: FONT.small, opacity: 0.6, marginTop: 4},
});
