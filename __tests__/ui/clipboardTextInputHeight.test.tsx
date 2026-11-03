// docs/dev/design-device-rendering.md §5.3: the field's flex: 1 wrapper keeps a minimum height, so
// in a column without free height (the contexts editor's Name field) it can't collapse to a flat,
// untappable line.

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {getString: jest.fn(async () => ''), setString: jest.fn()},
}));

import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import ClipboardTextInput, {TEXT_FIELD_MIN_H, TEXT_FIELD_MULTILINE_MIN_H} from '../../src/ui/ClipboardTextInput';

function wrapperStyle(multiline: boolean) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      <View style={{flexShrink: 0}}>
        <ClipboardTextInput value="" onChangeText={() => undefined} placeholderColor="#888" textColor="#000" borderColor="#000" multiline={multiline} />
      </View>,
    );
  });
  const input = r.root.findByType(TextInput);
  // The field's own wrapper view (a host "View" or the View component, depending on the renderer).
  const wrapper = input.parent!;
  return StyleSheet.flatten(wrapper.props.style);
}

describe('ClipboardTextInput height', () => {
  it('keeps a one-line minimum height in a column', () => {
    const style = wrapperStyle(false);
    expect(style.flex).toBe(1);
    expect(style.minHeight).toBe(TEXT_FIELD_MIN_H);
    expect(TEXT_FIELD_MIN_H).toBeGreaterThanOrEqual(33);
  });

  it('keeps the multiline minimum height in a column', () => {
    expect(wrapperStyle(true).minHeight).toBe(TEXT_FIELD_MULTILINE_MIN_H);
  });
});
