// docs/dev/history/technical-design-in-app-updates.md §4, §8: the check and the download, with a
// mocked fetch, mocked permissions, files and native module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('sn-plugin-lib', () => ({PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
jest.mock('../../src/supernote/pluginPermissions', () => ({
  INTERNET_PERMISSION: 'plugin.permission.INTERNET',
  hasPluginPermission: jest.fn(async () => true),
  ensureInternetPermission: jest.fn(async () => true),
  ensureFileWritePermission: jest.fn(async () => true),
}));
jest.mock('../../src/supernote/fileSystem', () => ({
  statFiles: jest.fn(),
  ensureFolderExists: jest.fn(async () => undefined),
  getPrivateTempDir: jest.fn(async () => '/private/tmp'),
  deleteTempTree: jest.fn(async () => undefined),
}));
jest.mock('../../src/supernote/fileNative', () => ({notifyFolderChanged: jest.fn()}));
jest.mock('../../src/supernote/updateNative', () => ({getKeptUpdateNative: jest.fn()}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AvailableUpdate, LATEST_RELEASE_URL} from '../../src/domain/updateCheck';
import {UPDATE_STATE_KEY} from '../../src/domain/storeKeys';
import {deleteTempTree, statFiles} from '../../src/supernote/fileSystem';
import {notifyFolderChanged} from '../../src/supernote/fileNative';
import {ensureInternetPermission, hasPluginPermission} from '../../src/supernote/pluginPermissions';
import {getKeptUpdateNative} from '../../src/supernote/updateNative';
import {
  UPDATE_DOWNLOAD_FOLDER,
  checkForUpdate,
  dismissUpdate,
  downloadUpdate,
  getUpdateSnapshot,
  knownUpdate,
  loadUpdateState,
  resetUpdatesForTests,
  setUpdateTestMode,
  subscribeUpdates,
} from '../../src/storage/updates';

const HEX = 'b'.repeat(64);
const OTHER = 'c'.repeat(64);
const SIZE = 4_404_019;

function releaseJson(version = '99.0.0') {
  return {
    draft: false,
    prerelease: false,
    tag_name: `v${version}`,
    published_at: '2026-11-20T10:00:00Z',
    body: 'Notes',
    assets: [
      {
        name: `kept-gtd-${version}.snplg`,
        size: SIZE,
        digest: `sha256:${HEX}`,
        browser_download_url: `https://github.com/tilmanbergt/kept-gtd/releases/download/v${version}/kept-gtd-${version}.snplg`,
      },
    ],
  };
}

const UPDATE: AvailableUpdate = {
  version: '99.0.0',
  tag: 'v99.0.0',
  publishedAt: null,
  notes: '',
  asset: {
    name: 'kept-gtd-99.0.0.snplg',
    url: 'https://github.com/tilmanbergt/kept-gtd/releases/download/v99.0.0/kept-gtd-99.0.0.snplg',
    size: SIZE,
    sha256: HEX,
  },
};

const fetchMock = jest.fn();
(global as unknown as {fetch: jest.Mock}).fetch = fetchMock;

function answer(status: number, body: unknown = {}) {
  fetchMock.mockResolvedValue({status, ok: status >= 200 && status < 300, json: async () => body});
}

/** The fake MyStyle/kept-gtd: name → {size, sha256}. */
let myStyle: Map<string, {size: number; sha256: string}>;
const native = {
  download: jest.fn(async (_url: string, fileName: string) => ({path: `/private/tmp/${fileName}`, size: SIZE, sha256: HEX})),
  sha256File: jest.fn(async (path: string) => myStyle.get(path.slice(UPDATE_DOWNLOAD_FOLDER.length + 1))?.sha256 ?? ''),
  copyIntoFolder: jest.fn(async (_from: string, folder: string, name: string) => {
    if (myStyle.has(name)) throw new Error('E_DEST_EXISTS');
    myStyle.set(name, {size: SIZE, sha256: HEX});
    return `${folder}/${name}`;
  }),
};

beforeEach(async () => {
  resetUpdatesForTests();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  myStyle = new Map();
  (getKeptUpdateNative as jest.Mock).mockReturnValue(native);
  (hasPluginPermission as jest.Mock).mockResolvedValue(true);
  (ensureInternetPermission as jest.Mock).mockResolvedValue(true);
  (statFiles as jest.Mock).mockImplementation(async (paths: string[]) =>
    paths.map(path => {
      const f = myStyle.get(path.slice(UPDATE_DOWNLOAD_FOLDER.length + 1));
      return {path, exists: !!f, lastModified: 0, size: f ? f.size : -1};
    }),
  );
});

describe('checkForUpdate', () => {
  it('finds a newer release, stores it and sends the GitHub headers', async () => {
    answer(200, releaseJson());
    const result = await checkForUpdate({silent: false});
    expect(result.kind).toBe('available');
    expect(fetchMock).toHaveBeenCalledWith(LATEST_RELEASE_URL, {headers: expect.objectContaining({Accept: 'application/vnd.github+json', 'User-Agent': expect.stringMatching(/^KeptGTD\//)})});
    expect(getUpdateSnapshot().latest?.version).toBe('99.0.0');
    expect(getUpdateSnapshot().lastCheckAt).not.toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(UPDATE_STATE_KEY))!).latest.version).toBe('99.0.0');
  });

  it('an older release is up to date and clears what was stored', async () => {
    answer(200, releaseJson());
    await checkForUpdate({silent: false});
    answer(200, releaseJson('0.0.1'));
    expect(await checkForUpdate({silent: false})).toEqual({kind: 'upToDate', version: '0.0.1'});
    expect(getUpdateSnapshot().latest).toBeNull();
  });

  it('the test switch offers the latest real release', async () => {
    answer(200, releaseJson('0.0.1'));
    setUpdateTestMode(true);
    expect((await checkForUpdate({silent: false})).kind).toBe('available');
    expect(knownUpdate()?.version).toBe('0.0.1');
    setUpdateTestMode(false);
    expect(knownUpdate()).toBeNull();
  });

  it('a manual check without permission asks, and says why after a refusal', async () => {
    (ensureInternetPermission as jest.Mock).mockResolvedValue(false);
    expect(await checkForUpdate({silent: false})).toEqual({kind: 'noPermission'});
    expect(ensureInternetPermission).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getUpdateSnapshot().lastError).toContain('without internet access');
  });

  it('a silent check without permission makes no request and shows no dialog', async () => {
    (hasPluginPermission as jest.Mock).mockResolvedValue(false);
    expect(await checkForUpdate({silent: true})).toEqual({kind: 'noPermission'});
    expect(ensureInternetPermission).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getUpdateSnapshot().lastError).toBe('The daily check needs internet access - tap Check now.');
  });

  it.each([
    [404, 'noRelease'],
    [403, 'rateLimited'],
    [429, 'rateLimited'],
    [500, 'error'],
  ])('HTTP %s → %s', async (status, kind) => {
    answer(status);
    expect((await checkForUpdate({silent: false})).kind).toBe(kind);
    expect(getUpdateSnapshot().lastError).not.toBeNull();
  });

  it('no network → error, nothing stored', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    expect(await checkForUpdate({silent: false})).toEqual({kind: 'error'});
    expect(getUpdateSnapshot().lastCheckAt).toBeNull();
  });

  it('a release without a digest is unusable', async () => {
    const json = releaseJson();
    delete (json.assets[0] as {digest?: string}).digest;
    answer(200, json);
    expect(await checkForUpdate({silent: false})).toEqual({kind: 'unusable'});
  });

  it('a second call while one runs gets the same answer from one request', async () => {
    answer(200, releaseJson());
    const [a, b] = await Promise.all([checkForUpdate({silent: true}), checkForUpdate({silent: false})]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tells subscribers while it checks and when it is done', async () => {
    answer(200, releaseJson());
    const seen: Array<string | null> = [];
    subscribeUpdates(() => seen.push(getUpdateSnapshot().busy));
    await checkForUpdate({silent: false});
    expect(seen[0]).toBe('checking');
    expect(seen[seen.length - 1]).toBeNull();
  });
});

describe('stored state', () => {
  it('Not now and what was found survive a restart', async () => {
    answer(200, releaseJson());
    await checkForUpdate({silent: false});
    await dismissUpdate('99.0.0');
    resetUpdatesForTests();
    const s = await loadUpdateState();
    expect(s.dismissedVersion).toBe('99.0.0');
    expect(s.latest?.version).toBe('99.0.0');
  });
  it('an unreadable entry reads as empty', async () => {
    await AsyncStorage.setItem(UPDATE_STATE_KEY, '{not json');
    expect((await loadUpdateState()).latest).toBeNull();
  });
});

describe('downloadUpdate', () => {
  it('saves into MyStyle/kept-gtd through the private folder and says where', async () => {
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'saved', path: 'MyStyle/kept-gtd/kept-gtd-99.0.0.snplg'});
    expect(native.download).toHaveBeenCalledWith(UPDATE.asset.url, 'update-kept-gtd-99.0.0.snplg', expect.any(Number), expect.stringMatching(/^KeptGTD\//));
    expect(native.copyIntoFolder).toHaveBeenCalledWith('/private/tmp/update-kept-gtd-99.0.0.snplg', UPDATE_DOWNLOAD_FOLDER, 'kept-gtd-99.0.0.snplg');
    expect(deleteTempTree).toHaveBeenCalledWith('/private/tmp/update-kept-gtd-99.0.0.snplg');
    expect(notifyFolderChanged).toHaveBeenCalledWith(UPDATE_DOWNLOAD_FOLDER);
    expect(getUpdateSnapshot().downloaded).toEqual({version: '99.0.0', path: 'MyStyle/kept-gtd/kept-gtd-99.0.0.snplg'});
  });

  it('a matching file already there is not downloaded again', async () => {
    myStyle.set('kept-gtd-99.0.0.snplg', {size: SIZE, sha256: HEX});
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'already', path: 'MyStyle/kept-gtd/kept-gtd-99.0.0.snplg'});
    expect(native.download).not.toHaveBeenCalled();
  });

  it('a different file of that name keeps its name; the download takes the next free one', async () => {
    myStyle.set('kept-gtd-99.0.0.snplg', {size: SIZE, sha256: OTHER});
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'saved', path: 'MyStyle/kept-gtd/kept-gtd-99.0.0 (2).snplg'});
    expect(myStyle.get('kept-gtd-99.0.0.snplg')?.sha256).toBe(OTHER);
  });

  it('a mismatch removes the temp file and leaves nothing in MyStyle', async () => {
    native.download.mockResolvedValueOnce({path: '/private/tmp/update-kept-gtd-99.0.0.snplg', size: SIZE, sha256: OTHER});
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'mismatch'});
    expect(native.copyIntoFolder).not.toHaveBeenCalled();
    expect(myStyle.size).toBe(0);
    expect(deleteTempTree).toHaveBeenCalledWith('/private/tmp/update-kept-gtd-99.0.0.snplg');
    expect(getUpdateSnapshot().lastDownload).toEqual({kind: 'mismatch'});
  });

  it('a failed download removes the temp file and reports an error', async () => {
    native.download.mockRejectedValueOnce(new Error('E_NETWORK'));
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'error'});
    expect(deleteTempTree).toHaveBeenCalledWith('/private/tmp/update-kept-gtd-99.0.0.snplg');
    expect(myStyle.size).toBe(0);
  });

  it('without permission nothing is fetched', async () => {
    (ensureInternetPermission as jest.Mock).mockResolvedValue(false);
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'noPermission'});
    expect(native.download).not.toHaveBeenCalled();
  });

  it('a build without the native module says so', async () => {
    (getKeptUpdateNative as jest.Mock).mockReturnValue(undefined);
    expect(await downloadUpdate(UPDATE)).toEqual({kind: 'notSupported'});
  });

  it('a second tap while it runs downloads once', async () => {
    const [a, b] = await Promise.all([downloadUpdate(UPDATE), downloadUpdate(UPDATE)]);
    expect(a).toBe(b);
    expect(native.download).toHaveBeenCalledTimes(1);
  });
});

describe('loadUpdateState', () => {
  it('resolves what is current, not what was read first', async () => {
    await loadUpdateState();
    answer(200, releaseJson());
    await checkForUpdate({silent: true});
    expect((await loadUpdateState()).lastCheckAt).not.toBeNull();
  });
});
