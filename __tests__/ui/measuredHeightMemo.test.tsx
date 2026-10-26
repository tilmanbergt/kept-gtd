// docs/dev/history/technical-design-perf-current-page.md §3.5: a box measured before starts with that height.
jest.mock('../../src/utils/perf', () => ({perfMark: jest.fn()}));

import React from 'react';
import {LayoutChangeEvent} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import {useMeasuredHeight} from '../../src/ui/useMeasuredHeight';

const layout = (height: number) => ({nativeEvent: {layout: {x: 0, y: 0, width: 100, height}}}) as LayoutChangeEvent;
const seen: Array<number | null> = [];
let onLayout!: (e: LayoutChangeEvent) => void;
function Probe({memoKey}: {memoKey?: string}): null {
  const [measure, height] = useMeasuredHeight(memoKey);
  onLayout = measure;
  seen.push(height);
  return null;
}

beforeEach(() => {
  seen.length = 0;
});

it('starts a keyed box with its last height and renders nothing again for the same measurement', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<Probe memoKey="test:Todos" />);
  });
  act(() => onLayout(layout(435)));
  act(() => r.unmount());
  expect(seen).toEqual([null, 435]);

  seen.length = 0;
  act(() => {
    r = TestRenderer.create(<Probe memoKey="test:Todos" />);
  });
  act(() => onLayout(layout(435)));
  expect(seen).toEqual([435]);
  act(() => onLayout(layout(442)));
  expect(seen).toEqual([435, 442]);
  act(() => r.unmount());
});

it('remembers nothing without a key', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<Probe />);
  });
  act(() => onLayout(layout(300)));
  act(() => r.unmount());
  seen.length = 0;
  act(() => {
    r = TestRenderer.create(<Probe />);
  });
  expect(seen).toEqual([null]);
  act(() => r.unmount());
});
