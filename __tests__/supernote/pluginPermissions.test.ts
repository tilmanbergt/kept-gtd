// docs/dev/history/technical-design-perf-threads.md §3.7, §6 scenarios 8-9: a granted permission is
// remembered for the session and forgotten when a file call fails.
jest.mock('sn-plugin-lib', () => ({PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

import {NativeModules} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {log} from '../../src/utils/log';
import {
  ensureFileReadPermission,
  ensureFileWritePermission,
  FILE_READ_PERMISSION,
  forgetPermissionGrants,
} from '../../src/supernote/pluginPermissions';

const mockManager = PluginManager as unknown as {hasPermission?: jest.Mock; requestPermission?: jest.Mock};
const mockFile = {readTextFile: jest.fn(async () => 'text'), writeTextFile: jest.fn(async () => 'atomic')};
(NativeModules as {GtdParaFile?: unknown}).GtdParaFile = mockFile;
// Loaded after the native module is in place: fileSystem.ts reads it once.
const fileSystem: typeof import('../../src/supernote/fileSystem') = require('../../src/supernote/fileSystem');

beforeEach(() => {
  forgetPermissionGrants();
  mockManager.hasPermission = jest.fn(async () => 1);
  mockManager.requestPermission = jest.fn(async () => 1);
  (log as jest.Mock).mockClear();
});

describe('ensurePluginPermission grants', () => {
  it('asks the host once; a later check makes no bridge call and logs nothing', async () => {
    expect(await ensureFileReadPermission()).toBe(true);
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(1);
    (log as jest.Mock).mockClear();
    expect(await ensureFileReadPermission()).toBe(true);
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });

  it('remembers each permission on its own', async () => {
    await ensureFileReadPermission();
    await ensureFileWritePermission();
    expect(mockManager.hasPermission!.mock.calls.map(c => c[0])).toEqual([FILE_READ_PERMISSION, 'plugin.permission.FILE:WRITE']);
  });

  it('remembers a grant given in the request dialog', async () => {
    mockManager.hasPermission = jest.fn(async () => 0);
    expect(await ensureFileReadPermission()).toBe(true);
    expect(await ensureFileReadPermission()).toBe(true);
    expect(mockManager.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('never remembers a denial: the next call asks again', async () => {
    mockManager.hasPermission = jest.fn(async () => 0);
    mockManager.requestPermission = jest.fn(async () => 0);
    expect(await ensureFileReadPermission()).toBe(false);
    expect(await ensureFileReadPermission()).toBe(false);
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(2);
  });

  it('never remembers a timeout', async () => {
    jest.useFakeTimers();
    try {
      mockManager.hasPermission = jest.fn(() => new Promise<number>(() => undefined));
      const first = ensureFileReadPermission();
      jest.advanceTimersByTime(8000);
      expect(await first).toBe(false);
      mockManager.hasPermission = jest.fn(async () => 1);
      expect(await ensureFileReadPermission()).toBe(true);
      expect(mockManager.hasPermission).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('asks again after forgetPermissionGrants', async () => {
    await ensureFileReadPermission();
    forgetPermissionGrants();
    await ensureFileReadPermission();
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(2);
  });
});

describe('scenario 9: a failed file call forgets the grants', () => {
  it('asks the host again on the next file call', async () => {
    expect(await fileSystem.readTextFile('/a.txt')).toBe('text');
    expect(await fileSystem.readTextFile('/a.txt')).toBe('text');
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(1);
    mockFile.readTextFile.mockImplementationOnce(async () => {
      throw new Error('EACCES');
    });
    await expect(fileSystem.readTextFile('/a.txt')).rejects.toThrow('EACCES');
    expect(await fileSystem.readTextFile('/a.txt')).toBe('text');
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(2);
  });

  it('also after a failed write of the log file, which itself logs nothing', async () => {
    (NativeModules as {GtdParaFile: Record<string, unknown>}).GtdParaFile.appendTextFile = jest.fn(async () => {
      throw new Error('ENOSPC');
    });
    await ensureFileWritePermission();
    (log as jest.Mock).mockClear();
    await expect(fileSystem.appendDebugLogFile('log.txt', 'line\n', 1000)).rejects.toThrow('ENOSPC');
    expect(log).not.toHaveBeenCalled();
    await ensureFileWritePermission();
    expect(mockManager.hasPermission).toHaveBeenCalledTimes(2);
  });
});
