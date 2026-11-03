// docs/dev/history/technical-design-fresh-start-profile.md §3.6, scenarios 10-11: a dialog a person
// answers slowly still counts, and a permission is asked once until the host answers.
jest.mock('sn-plugin-lib', () => ({PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

import {PluginManager} from 'sn-plugin-lib';
import {ensureFileReadPermission, forgetPermissionGrants} from '../../src/supernote/pluginPermissions';

const mockManager = PluginManager as unknown as {hasPermission?: jest.Mock; requestPermission?: jest.Mock};

/** A requestPermission the test answers by hand. */
function heldDialog(): {answer: (value: number) => void} {
  let answer: (value: number) => void = () => undefined;
  mockManager.requestPermission = jest.fn(() => new Promise<number>(resolve => (answer = resolve)));
  return {answer: value => answer(value)};
}

/** Lets pending promise callbacks run between timer steps. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
  jest.useFakeTimers();
  forgetPermissionGrants();
  mockManager.hasPermission = jest.fn(async () => 0);
});

afterEach(() => {
  jest.useRealTimers();
});

it('a dialog answered "granted" after 9 s counts as granted', async () => {
  const dialog = heldDialog();
  const result = ensureFileReadPermission();
  await flush();
  jest.advanceTimersByTime(9000);
  dialog.answer(1);
  await flush();
  expect(await result).toBe(true);
});

it('two callers while the host has not answered share one dialog and its answer', async () => {
  const dialog = heldDialog();
  const first = ensureFileReadPermission();
  await flush();
  const second = ensureFileReadPermission();
  await flush();
  dialog.answer(1);
  expect(await Promise.all([first, second])).toEqual([true, true]);
  expect(mockManager.requestPermission).toHaveBeenCalledTimes(1);
});

it('after a caller timed out, the next one joins the open dialog; a late grant is recorded', async () => {
  const dialog = heldDialog();
  const first = ensureFileReadPermission();
  await flush();
  jest.advanceTimersByTime(121000);
  await flush();
  expect(await first).toBe(false);
  const second = ensureFileReadPermission();
  await flush();
  expect(mockManager.requestPermission).toHaveBeenCalledTimes(1);
  dialog.answer(1);
  await flush();
  expect(await second).toBe(true);
  mockManager.hasPermission?.mockClear();
  expect(await ensureFileReadPermission()).toBe(true);
  expect(mockManager.hasPermission).not.toHaveBeenCalled();
  expect(mockManager.requestPermission).toHaveBeenCalledTimes(1);
});

it('a host that never answers hasPermission still resolves false after 8 s', async () => {
  mockManager.hasPermission = jest.fn(() => new Promise<number>(() => undefined));
  const result = ensureFileReadPermission();
  await flush();
  jest.advanceTimersByTime(8001);
  await flush();
  expect(await result).toBe(false);
});
