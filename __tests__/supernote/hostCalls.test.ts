// docs/dev/history/technical-design-filesystem-split.md §5 R0: pins how every wrapped host call
// behaves - permission refused, success:false, a refused result, success (log lines, return value),
// the recordDebugLogEntry lines, insertNotePage's timeout and openPath's rollback - so the split and
// the shared wrapper change none of it.
const mockSdk = {
  PluginFileAPI: {} as Record<string, jest.Mock>,
  PluginCommAPI: {} as Record<string, jest.Mock>,
};
const mockPerm = {read: true, write: true};
// Getters: the factory runs before this file's constants exist; the SDK is read at each call.
jest.mock('sn-plugin-lib', () => ({
  PluginManager: {},
  PluginNoteAPI: {},
  get PluginFileAPI() {
    return mockSdk.PluginFileAPI;
  },
  get PluginCommAPI() {
    return mockSdk.PluginCommAPI;
  },
}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
jest.mock('../../src/supernote/pluginPermissions', () => ({
  ensureFileReadPermission: jest.fn(async () => mockPerm.read),
  ensureFileWritePermission: jest.fn(async () => mockPerm.write),
  ensureFileDeletePermission: jest.fn(async () => true),
  forgetPermissionGrants: jest.fn(),
  forgetGrantsAndRethrow: (e: unknown) => {
    throw e;
  },
  logFileCallFailure: jest.fn(),
}));

import {forgetPermissionGrants, logFileCallFailure} from '../../src/supernote/pluginPermissions';
import {log, logError, logWarn} from '../../src/utils/log';
import * as fileSystem from '../../src/supernote/fileSystem';
import * as hostContext from '../../src/supernote/hostContext';
import * as noteFileApi from '../../src/supernote/noteFileApi';
import {NOTE_CREATION_BLOCKED_TEXT} from '../../src/domain/noteCreation';

/** Every wrapped host call, wherever it lives. */
const fs = {...fileSystem, ...noteFileApi, ...hostContext};

const ok = <T>(result: T) => ({success: true, result});
const fail = (message: string) => ({success: false, error: {code: 1, message}});
const P = '/storage/emulated/0/Note/a.note';

/** The "hostCall: <event> OK|FAIL" line recordDebugLogEntry writes. */
function hostCallLines(): string[] {
  return [...(log as jest.Mock).mock.calls, ...(logWarn as jest.Mock).mock.calls].map(c => c[0]).filter(t => String(t).startsWith('hostCall:'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPerm.read = true;
  mockPerm.write = true;
  for (const k of Object.keys(mockSdk.PluginFileAPI)) delete mockSdk.PluginFileAPI[k];
  for (const k of Object.keys(mockSdk.PluginCommAPI)) delete mockSdk.PluginCommAPI[k];
});

interface Case {
  name: string;
  api: 'PluginFileAPI' | 'PluginCommAPI';
  sdk: string;
  run: () => Promise<unknown>;
  permission: 'read' | 'write' | null;
  /** The thrown text when the host says success:false without a message. */
  fallback: string;
  /** A successful result and what the wrapper returns for it. */
  good: unknown;
  returns: unknown;
  /** A result the wrapper refuses although success is true. */
  refused?: unknown;
  startLine: unknown[];
  doneLine: unknown[];
  /** The failure log: logFileCallFailure (file calls) or logError (createElement). */
  failLog: {fn: 'logFileCallFailure' | 'logError'; args: unknown[]};
  record?: string;
}

const CASES: Case[] = [
  {
    name: 'insertKeyWord', api: 'PluginFileAPI', sdk: 'insertKeyWord', run: () => fs.insertKeyWord(P, 2, 'kw'), permission: 'write',
    fallback: 'Could not add the keyword.', good: true, returns: undefined, refused: false,
    startLine: ['insertKeyWord: start', P, 'page=2', 'kw'], doneLine: ['insertKeyWord: done', P, 'kw'],
    failLog: {fn: 'logFileCallFailure', args: ['insertKeyWord: failed', P, 'kw', 'MSG']},
  },
  {
    name: 'getKeyWords', api: 'PluginFileAPI', sdk: 'getKeyWords', run: () => fs.getKeyWords(P, [0, 1]), permission: 'read',
    fallback: "Could not read this note's keywords.", good: [{keyword: 'k', page: 0, index: 1}], returns: [{keyword: 'k', page: 0, index: 1}],
    startLine: ['getKeyWords: start', P, '2 pages'], doneLine: ['getKeyWords: done', P, '1 keywords'],
    failLog: {fn: 'logFileCallFailure', args: ['getKeyWords: failed', P, 'MSG']},
  },
  {
    name: 'deleteKeyWord', api: 'PluginFileAPI', sdk: 'deleteKeyWord', run: () => fs.deleteKeyWord(P, 1, 3), permission: 'write',
    fallback: 'Could not remove the keyword.', good: true, returns: undefined, refused: false,
    startLine: ['deleteKeyWord: start', P, 'page=1', 'index=3'], doneLine: ['deleteKeyWord: done', P, 'page=1'],
    failLog: {fn: 'logFileCallFailure', args: ['deleteKeyWord: failed', P, 'page=1', 'MSG']},
  },
  {
    name: 'getNoteTotalPageNum', api: 'PluginFileAPI', sdk: 'getNoteTotalPageNum', run: () => fs.getNoteTotalPageNum(P), permission: 'read',
    fallback: "Could not read this note's page count.", good: 4, returns: 4, refused: null,
    startLine: ['getNoteTotalPageNum: start', P], doneLine: ['getNoteTotalPageNum: done', P, '4 pages'],
    failLog: {fn: 'logFileCallFailure', args: ['getNoteTotalPageNum: failed', P, 'MSG']},
  },
  {
    name: 'createElement', api: 'PluginCommAPI', sdk: 'createElement', run: () => fs.createElement(500), permission: null,
    fallback: 'Could not create the element.', good: {uuid: 'u1'}, returns: {uuid: 'u1'}, refused: null,
    startLine: ['createElement: start', 'type=500'], doneLine: ['createElement: done', 500, 'u1'],
    failLog: {fn: 'logError', args: ['createElement: failed', 500, 'MSG']},
  },
  {
    name: 'getElements', api: 'PluginFileAPI', sdk: 'getElements', run: () => fs.getElements(3, P), permission: 'read',
    fallback: "Could not read this page's elements.", good: [{uuid: 'a'}, {uuid: 'b'}], returns: [{uuid: 'a'}, {uuid: 'b'}],
    startLine: ['getElements: start', P, 'page=3'], doneLine: ['getElements: done', P, '2 elements'],
    failLog: {fn: 'logFileCallFailure', args: ['getElements: failed', P, 'MSG']}, record: 'getElements',
  },
  {
    name: 'insertElements', api: 'PluginFileAPI', sdk: 'insertElements', run: () => fs.insertElements(P, 0, [{uuid: 'a'} as noteFileApi.Element]), permission: 'write',
    fallback: 'Could not insert the elements.', good: true, returns: undefined, refused: false,
    startLine: ['insertElements: start', P, 'page=0', '1 elements'], doneLine: ['insertElements: done', P],
    failLog: {fn: 'logFileCallFailure', args: ['insertElements: failed', P, 'MSG']}, record: 'insertElements',
  },
  {
    name: 'deleteElements', api: 'PluginFileAPI', sdk: 'deleteElements', run: () => fs.deleteElements(P, 0, [2, 3]), permission: 'write',
    fallback: 'Could not delete the elements.', good: true, returns: undefined, refused: false,
    startLine: ['deleteElements: start', P, 'page=0', [2, 3]], doneLine: ['deleteElements: done', P],
    failLog: {fn: 'logFileCallFailure', args: ['deleteElements: failed', P, 'MSG']},
  },
  {
    name: 'insertNotePage', api: 'PluginFileAPI', sdk: 'insertNotePage', run: () => fs.insertNotePage(P, 1, 'style_white'), permission: 'write',
    fallback: 'Could not add page 2 to the note.', good: true, returns: undefined, refused: false,
    startLine: ['insertNotePage: start', P, 'page=1', 'style_white'], doneLine: ['insertNotePage: done', P, 'page=1'],
    failLog: {fn: 'logFileCallFailure', args: ['insertNotePage: failed', P, 'page=1', 'MSG']},
  },
];

const failFn = (c: Case) => (c.failLog.fn === 'logError' ? logError : logFileCallFailure) as jest.Mock;

describe.each(CASES)('$name', c => {
  const sdk = (impl: () => unknown) => {
    mockSdk[c.api][c.sdk] = jest.fn(async () => impl());
  };

  if (c.permission) {
    it('refuses without the permission: no host call, the permission line and text', async () => {
      if (c.permission === 'read') mockPerm.read = false;
      else mockPerm.write = false;
      sdk(() => ok(c.good));
      await expect(c.run()).rejects.toThrow(c.permission === 'read' ? 'File read permission was not granted.' : 'File write permission was not granted.');
      expect(mockSdk[c.api][c.sdk]).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(`${c.name}: file ${c.permission} permission not granted`, P);
    });
  }

  it('success:false throws the host message and logs the failure', async () => {
    sdk(() => fail('MSG'));
    await expect(c.run()).rejects.toThrow('MSG');
    expect(failFn(c)).toHaveBeenCalledWith(...c.failLog.args);
    if (c.record) expect(hostCallLines()).toEqual([`hostCall: ${c.record} FAIL`]);
  });

  it('success:false without a message throws the fallback text', async () => {
    sdk(() => ({success: false}));
    await expect(c.run()).rejects.toThrow(c.fallback);
  });

  it('no response at all counts as a failure', async () => {
    sdk(() => null);
    await expect(c.run()).rejects.toThrow(c.fallback);
  });

  if ('refused' in c) {
    it('a refused result fails although success is true', async () => {
      sdk(() => ok(c.refused));
      await expect(c.run()).rejects.toThrow(c.fallback);
    });
  }

  it('success: start and done lines, the result', async () => {
    sdk(() => ok(c.good));
    await expect(c.run()).resolves.toEqual(c.returns);
    expect(log).toHaveBeenCalledWith(...c.startLine);
    expect(log).toHaveBeenCalledWith(...c.doneLine);
    if (c.record) expect(hostCallLines()).toEqual([`hostCall: ${c.record} OK`]);
  });
});

describe('getKeyWords and getElements read a missing result as empty', () => {
  it('returns [] for result null', async () => {
    mockSdk.PluginFileAPI.getKeyWords = jest.fn(async () => ok(null));
    mockSdk.PluginFileAPI.getElements = jest.fn(async () => ok(null));
    await expect(fs.getKeyWords(P, [])).resolves.toEqual([]);
    await expect(fs.getElements(0, P)).resolves.toEqual([]);
  });
});

describe('createNote', () => {
  it('the host gate becomes the plain limitation sentence; the host text stays in the log and the record', async () => {
    mockSdk.PluginFileAPI.createNote = jest.fn(async () => fail('This app is not allowed to use this API'));
    await expect(fs.createNote(P, 'style_white')).rejects.toThrow(NOTE_CREATION_BLOCKED_TEXT);
    expect(logFileCallFailure).toHaveBeenCalledWith('createNote: failed', P, 'This app is not allowed to use this API');
    expect(hostCallLines()).toEqual(['hostCall: createNote FAIL']);
    expect((logWarn as jest.Mock).mock.calls[0][2]).toBe('notePath=/storage/emulated/0/Note/a.note template=style_white isPortrait=true errorMessage=This app is not allowed to use this API');
  });
  it('opened from a document: not tried, the limitation sentence instead', async () => {
    mockSdk.PluginFileAPI.createNote = jest.fn(async () => ok(true));
    hostContext.rememberLaunchNotePath('/storage/emulated/0/Document/Book.pdf');
    try {
      await expect(fs.createNote(P, 'style_white')).rejects.toThrow(NOTE_CREATION_BLOCKED_TEXT);
      expect(mockSdk.PluginFileAPI.createNote).not.toHaveBeenCalled();
      expect(logWarn).toHaveBeenCalledWith('createNote: not tried, Kept was opened from a document');
    } finally {
      hostContext.rememberLaunchNotePath(null);
    }
  });
  it('another refusal keeps the device-gate wording with the host text', async () => {
    mockSdk.PluginFileAPI.createNote = jest.fn(async () => fail('Background template file does not exist'));
    await expect(fs.createNote(P, 'style_white')).rejects.toThrow('Though write permission is granted, note creation was blocked by the device: Background template file does not exist');
  });
  it('result false fails with the fallback host text', async () => {
    mockSdk.PluginFileAPI.createNote = jest.fn(async () => ok(false));
    await expect(fs.createNote(P, 'style_white')).rejects.toThrow('note creation was blocked by the device: Could not create the note.');
  });
  it('success: the call, its lines and the recorded OK', async () => {
    mockSdk.PluginFileAPI.createNote = jest.fn(async () => ok(true));
    await fs.createNote(P, 'style_white', false);
    expect(mockSdk.PluginFileAPI.createNote).toHaveBeenCalledWith({notePath: P, template: 'style_white', mode: 0, isPortrait: false});
    expect(log).toHaveBeenCalledWith('createNote: start', P, 'style_white');
    expect(log).toHaveBeenCalledWith('createNote: done', P);
    expect(hostCallLines()).toEqual(['hostCall: createNote OK']);
  });
  it('refuses without write permission', async () => {
    mockPerm.write = false;
    mockSdk.PluginFileAPI.createNote = jest.fn();
    await expect(fs.createNote(P, 'style_white')).rejects.toThrow('File write permission was not granted.');
    expect(logError).toHaveBeenCalledWith('createNote: file write permission not granted', P);
  });
});

describe('insertNotePage timeout', () => {
  it('rejects after 8 s when the host never answers', async () => {
    jest.useFakeTimers();
    try {
      mockSdk.PluginFileAPI.insertNotePage = jest.fn(() => new Promise(() => undefined));
      const outcome = fs.insertNotePage(P, 4, 'style_white').then(
        () => 'resolved',
        (e: Error) => e.message,
      );
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(8000);
      expect(await outcome).toBe('Timeout adding page 5 to the note.');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('openPath', () => {
  const observe = () => {
    const rollback = jest.fn();
    const onOpening = jest.fn(() => rollback);
    fs.setOpenPathObserver({onOpening});
    return {onOpening, rollback};
  };
  afterEach(() => fs.setOpenPathObserver(null));

  it('success: observer told before the host call, no rollback, OK recorded', async () => {
    const {onOpening, rollback} = observe();
    mockSdk.PluginFileAPI.openFile = jest.fn(async () => ok(true));
    await fs.openPath(P, 2);
    expect(onOpening).toHaveBeenCalledWith(P);
    expect(rollback).not.toHaveBeenCalled();
    expect(mockSdk.PluginFileAPI.openFile).toHaveBeenCalledWith(P, 2);
    expect(log).toHaveBeenCalledWith('openPath: start', P, 'page=2');
    expect(log).toHaveBeenCalledWith('openPath: done', P);
    expect(hostCallLines()).toEqual(['hostCall: openPath OK']);
  });
  it('success:false rolls back, logs and throws the host text', async () => {
    const {rollback} = observe();
    mockSdk.PluginFileAPI.openFile = jest.fn(async () => fail('no app'));
    await expect(fs.openPath(P)).rejects.toThrow('no app');
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(logFileCallFailure).toHaveBeenCalledWith('openPath: failed', P, 'no app');
    expect(hostCallLines()).toEqual(['hostCall: openPath FAIL']);
  });
  it('a thrown host call rolls back, forgets the grants and rethrows', async () => {
    const {rollback} = observe();
    mockSdk.PluginFileAPI.openFile = jest.fn(async () => {
      throw new Error('bridge down');
    });
    await expect(fs.openPath(P)).rejects.toThrow('bridge down');
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(forgetPermissionGrants).toHaveBeenCalled();
    expect(hostCallLines()).toEqual(['hostCall: openPath FAIL']);
  });
  it('no response: the fallback text', async () => {
    observe();
    mockSdk.PluginFileAPI.openFile = jest.fn(async () => null);
    await expect(fs.openPath(P)).rejects.toThrow('Could not open this file.');
  });
  it('refuses without read permission and tells no observer', async () => {
    const {onOpening} = observe();
    mockPerm.read = false;
    await expect(fs.openPath(P)).rejects.toThrow('File read permission was not granted.');
    expect(onOpening).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('openPath: file read permission not granted', P);
  });
});

describe('getCurrentNotePath', () => {
  it('the host path, or null without one or on a throw', async () => {
    mockSdk.PluginCommAPI.getCurrentFilePath = jest.fn(async () => ok('/x.pdf'));
    await expect(fs.getCurrentNotePath()).resolves.toBe('/x.pdf');
    mockSdk.PluginCommAPI.getCurrentFilePath = jest.fn(async () => fail('none'));
    await expect(fs.getCurrentNotePath()).resolves.toBeNull();
    mockSdk.PluginCommAPI.getCurrentFilePath = jest.fn(async () => {
      throw new Error('x');
    });
    await expect(fs.getCurrentNotePath()).resolves.toBeNull();
    expect(logError).toHaveBeenCalledWith('getCurrentNotePath: failed', 'x');
  });
});
