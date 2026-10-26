// docs/dev/history/technical-design-perf-current-page.md §3.1: components follow the settings snapshot.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
const mockLoad = jest.fn();
jest.mock('../../src/storage/settingsStorage', () => ({loadSettings: () => mockLoad()}));

import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {DEFAULT_SETTINGS, GtdParaSettings} from '../../src/domain/settings';
import {rememberSettings} from '../../src/storage/settingsSnapshot';
import {useSettings, useSettingsValue} from '../../src/ui/useSettings';

const renders = {all: 0, value: 0};
let seen: {all: GtdParaSettings | null; hideDone: boolean | null} = {all: null, hideDone: null};
function All(): null {
  renders.all++;
  seen.all = useSettings();
  return null;
}
function Value(): null {
  renders.value++;
  seen.hideDone = useSettingsValue(s => s.hideDoneProjectTasks);
  return null;
}

beforeEach(() => {
  rememberSettings(null);
  renders.all = 0;
  renders.value = 0;
  seen = {all: null, hideDone: null};
  mockLoad.mockReset();
});

it('starts from the snapshot without loading, and follows a change', async () => {
  const first = {...DEFAULT_SETTINGS};
  rememberSettings(first);
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<All />);
  });
  expect(seen.all).toBe(first);
  expect(renders.all).toBe(1);
  expect(mockLoad).not.toHaveBeenCalled();
  const next = {...first, hideDoneProjectTasks: true};
  await act(async () => rememberSettings(next));
  expect(seen.all).toBe(next);
  act(() => r.unmount());
});

it('re-renders a selected value only when it changes', async () => {
  rememberSettings({...DEFAULT_SETTINGS, hideDoneProjectTasks: false});
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<Value />);
  });
  expect([seen.hideDone, renders.value]).toEqual([false, 1]);
  await act(async () => rememberSettings({...DEFAULT_SETTINGS, hideDoneProjectTasks: false, hideDoneInboxTasks: true}));
  expect(renders.value).toBe(1);
  await act(async () => rememberSettings({...DEFAULT_SETTINGS, hideDoneProjectTasks: true}));
  expect([seen.hideDone, renders.value]).toEqual([true, 2]);
  act(() => r.unmount());
});

it('without a snapshot, loads once and uses the result', async () => {
  const loaded = {...DEFAULT_SETTINGS, hideDoneProjectTasks: true};
  mockLoad.mockResolvedValue(loaded);
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(<All />);
  });
  expect(mockLoad).toHaveBeenCalledTimes(1);
  expect(seen.all).toBe(loaded);
  act(() => r.unmount());
});
