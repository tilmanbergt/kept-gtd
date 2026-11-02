// docs/dev/history/technical-design-contexts-tags.md §8: chips page by where they really land.
jest.mock('sn-plugin-lib', () => ({PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
jest.mock('../../src/utils/screenRefresh', () => ({requestEinkRefresh: jest.fn(), useEinkRefreshOnLoad: jest.fn()}));

import React from 'react';
import {Pressable, Text} from 'react-native';
import TestRenderer, {act, ReactTestInstance, ReactTestRenderer} from 'react-test-renderer';
import PagedChipGrid, {ChipPager, useChipPages} from '../../src/ui/PagedChipGrid';

const LABELS = ['a', 'b', 'c', 'd', 'e'];
const chips = LABELS.map(label => ({key: label, label, on: false, onPress: () => undefined}));

function Grid({resetKey}: {resetKey: string}): React.JSX.Element {
  const pages = useChipPages(chips.length, resetKey);
  return (
    <>
      <ChipPager pages={pages} textColor="#000" />
      <PagedChipGrid chips={chips} pages={pages} textColor="#000" borderColor="#000" />
    </>
  );
}

const layout = (height: number, y = 0) => ({nativeEvent: {layout: {x: 0, y, width: 100, height}}});
/** Two chips a row, 40 high; the box holds two rows (100). */
function measure(r: ReactTestRenderer): void {
  const box = r.root.findAll(n => typeof n.props.onLayout === 'function' && n.type !== Pressable && !n.props.hitSlop)[0];
  act(() => box.props.onLayout(layout(100)));
  r.root.findAllByType(Pressable).filter(p => p.props.hitSlop && p.props.onLayout).forEach((p, i) => act(() => p.props.onLayout(layout(40, Math.floor(i / 2) * 50))));
}
const shown = (r: ReactTestRenderer) =>
  r.root
    .findAllByType(Pressable)
    .filter(p => p.props.onLayout && !p.props.disabled)
    .map(p => (p.findByType(Text).props.children as string));
const arrow = (r: ReactTestRenderer, name: string): ReactTestInstance => r.root.findAll(n => n.props.accessibilityLabel === name && n.props.onPress)[0];

it('shows every chip until measured, then only those that fit whole; › and ‹ page', () => {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<Grid resetKey="a" />);
  });
  expect(shown(r)).toEqual(LABELS);
  measure(r);
  expect(shown(r)).toEqual(['a', 'b', 'c', 'd']);
  act(() => arrow(r, 'Next chips').props.onPress());
  measure(r);
  expect(shown(r)).toEqual(['e']);
  expect(arrow(r, 'Next chips').props.disabled).toBe(true);
  act(() => arrow(r, 'Previous chips').props.onPress());
  measure(r);
  expect(shown(r)).toEqual(['a', 'b', 'c', 'd']);
});

it('goes back to the first page when the reset key changes', () => {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<Grid resetKey="a" />);
  });
  measure(r);
  act(() => arrow(r, 'Next chips').props.onPress());
  act(() => r.update(<Grid resetKey="b" />));
  measure(r);
  expect(shown(r)).toEqual(['a', 'b', 'c', 'd']);
});
