// docs/dev/history/technical-design-perf-current-page.md §3.1: one settings snapshot, identity-stable reads.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';
import {peekSettings, rememberSettings, subscribeSettings} from '../../src/storage/settingsSnapshot';
import {loadSettings, saveSettings} from '../../src/storage/settingsStorage';
import {BUILD_INFO} from '../../src/generated/buildInfo';

const KEY = 'gtdpara:settings:v1';

async function store(patch: Record<string, unknown>): Promise<void> {
  // A blob the migrations leave as it is, so a read returns it unchanged.
  const first = await (async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({...DEFAULT_SETTINGS, lastSeenVersion: BUILD_INFO.version, ...patch}));
    return loadSettings();
  })();
  await AsyncStorage.setItem(KEY, JSON.stringify(first));
}

beforeEach(async () => {
  await AsyncStorage.clear();
  rememberSettings(null);
});

describe('settings snapshot', () => {
  it('notifies only when it becomes another object', () => {
    const heard = jest.fn();
    const unsubscribe = subscribeSettings(heard);
    const a = {...DEFAULT_SETTINGS};
    rememberSettings(a);
    rememberSettings(a);
    rememberSettings({...a});
    unsubscribe();
    rememberSettings(null);
    expect(heard).toHaveBeenCalledTimes(2);
  });
});

describe('loadSettings', () => {
  it('returns the same object while the stored settings are unchanged, and notifies no one', async () => {
    await store({hideDoneProjectTasks: true});
    const first = await loadSettings();
    const heard = jest.fn();
    const unsubscribe = subscribeSettings(heard);
    const second = await loadSettings();
    unsubscribe();
    expect(second).toBe(first);
    expect(heard).not.toHaveBeenCalled();
    expect(peekSettings()).toBe(first);
  });

  it('returns a new object after a write and after an outside change of the stored text', async () => {
    await store({});
    const first = await loadSettings();
    await saveSettings({...first, hideDoneProjectTasks: true});
    const afterWrite = await loadSettings();
    expect(afterWrite).not.toBe(first);
    expect(afterWrite.hideDoneProjectTasks).toBe(true);
    expect(peekSettings()).toBe(afterWrite);
    await AsyncStorage.setItem(KEY, JSON.stringify({...afterWrite, hideDoneProjectTasks: false}));
    const afterOutside = await loadSettings();
    expect(afterOutside).not.toBe(afterWrite);
    expect(afterOutside.hideDoneProjectTasks).toBe(false);
  });

  it('shares one read between concurrent calls', async () => {
    await store({});
    rememberSettings(null);
    const getItem = jest.spyOn(AsyncStorage, 'getItem');
    getItem.mockClear();
    const [a, b, c] = await Promise.all([loadSettings(), loadSettings(), loadSettings()]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(getItem.mock.calls.filter(([k]) => k === KEY)).toHaveLength(1);
  });

  it('never puts a read that started before a write into the snapshot', async () => {
    await store({});
    const base = await loadSettings();
    // A changed stored text, so the read below parses (and resolves after the write).
    await AsyncStorage.setItem(KEY, JSON.stringify({...base, hideDoneProjectTasks: false, weeklyFocusCount: 7}));
    const reading = loadSettings();
    const written = {...base, hideDoneProjectTasks: true};
    await saveSettings(written);
    await reading;
    expect(peekSettings()).toBe(written);
  });
});
