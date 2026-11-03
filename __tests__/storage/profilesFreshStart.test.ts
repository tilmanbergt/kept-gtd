// docs/dev/history/technical-design-fresh-start-profile.md §3.2: on fresh settings (`freshStart`)
// a switch loads the saved file - also the one with the active id - and never saves the fresh
// settings over a profile first; listSavedProfiles reads without creating the folder.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('sn-plugin-lib', () => ({PluginCommAPI: {}, PluginFileAPI: {}, PluginManager: {}, NativePluginManager: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
const mockFiles = new Map<string, string>();
const mockCreated: string[] = [];
const FOLDER = '/EXPORT/kept-gtd/profiles';
jest.mock('../../src/supernote/devicePaths', () => ({
  PROFILES_FOLDER_PATH: '/EXPORT/kept-gtd/profiles',
}));
jest.mock('../../src/supernote/fileSystem', () => ({
  ensureFolderExists: async (path: string) => {
    mockCreated.push(path);
  },
  listFolderEntries: async (folder: string) =>
    [...mockFiles.keys()]
      .filter(p => p.startsWith(`${folder}/`))
      .map(p => ({name: p.slice(folder.length + 1), path: p, isFolder: false})),
  readTextFile: async (path: string) => mockFiles.get(path) ?? null,
  writeTextFile: async (path: string, content: string) => {
    mockFiles.set(path, content);
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_PROFILE_ID, serializeProfile} from '../../src/domain/profiles';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';
import {summarizeSettings} from '../../src/storage/debugBundle';
import {ensureDefaultProfileFile, listSavedProfiles, saveActiveProfile, switchProfile} from '../../src/storage/profiles';
import {loadSettings} from '../../src/storage/settingsStorage';

const PRODUCTION = `${FOLDER}/${DEFAULT_PROFILE_ID}.json`;
const DEMO = `${FOLDER}/demo.json`;
const CONTEXTS = [{id: 'work', name: 'Work', shows: [], hides: [], outsideMeetings: 'dim' as const}];
const saved = (name: string, at: string) =>
  serializeProfile(name, {...DEFAULT_SETTINGS, contexts: CONTEXTS, setupAssistant: 'done'}, new Date(at), 'test');

beforeEach(async () => {
  mockFiles.clear();
  mockCreated.length = 0;
  await AsyncStorage.clear();
});

describe('on a fresh install', () => {
  const before = saved('Production', '2026-11-01T09:00:00Z');
  beforeEach(async () => {
    mockFiles.set(PRODUCTION, before);
    mockFiles.set(DEMO, saved('Demo', '2026-11-02T09:00:00Z'));
    const fresh = await loadSettings();
    expect(fresh.freshStart).toBe(true);
    expect(fresh.setupAssistant).toBe('pending');
  });

  it('switching to the active id loads its file, clears the mark and leaves the file as it is', async () => {
    const next = await switchProfile(DEFAULT_PROFILE_ID);
    expect(next.contexts).toEqual(CONTEXTS);
    expect(next.freshStart).toBe(false);
    expect(next.setupAssistant).toBe('done');
    expect(mockFiles.get(PRODUCTION)).toBe(before);
  });

  it('switching to another profile does not save the fresh settings over the active one', async () => {
    const next = await switchProfile('demo');
    expect(next.activeProfileId).toBe('demo');
    expect(next.freshStart).toBe(false);
    expect(mockFiles.get(PRODUCTION)).toBe(before);
  });

  it('Save writes the active profile and clears the mark', async () => {
    await saveActiveProfile();
    expect(mockFiles.get(PRODUCTION)).not.toBe(before);
    expect((await loadSettings()).freshStart).toBe(false);
  });
});

it('fresh without production.json: putting the settings on file ends the fresh start', async () => {
  expect((await loadSettings()).freshStart).toBe(true);
  await ensureDefaultProfileFile();
  expect(mockFiles.has(PRODUCTION)).toBe(true);
  expect((await loadSettings()).freshStart).toBe(false);
});

it('fresh with production.json: the file is left as it is and the mark stays', async () => {
  const before = saved('Production', '2026-11-01T09:00:00Z');
  mockFiles.set(PRODUCTION, before);
  await ensureDefaultProfileFile();
  expect(mockFiles.get(PRODUCTION)).toBe(before);
  expect((await loadSettings()).freshStart).toBe(true);
});

describe('on stored settings', () => {
  beforeEach(async () => {
    await AsyncStorage.setItem('kept:settings:v1', JSON.stringify({...DEFAULT_SETTINGS, contexts: CONTEXTS}));
    mockFiles.set(DEMO, saved('Demo', '2026-11-02T09:00:00Z'));
  });

  it('switching to the active profile does nothing', async () => {
    const current = await loadSettings();
    expect(current.freshStart).toBe(false);
    expect(await switchProfile(DEFAULT_PROFILE_ID).catch(() => 'not found')).toBe('not found');
    mockFiles.set(PRODUCTION, saved('Production', '2026-11-01T09:00:00Z'));
    expect(await switchProfile(DEFAULT_PROFILE_ID)).toBe(current);
  });

  it('switching away saves the current profile first', async () => {
    await switchProfile('demo');
    expect(mockFiles.get(PRODUCTION)).toContain('"work"');
  });
});

describe('listSavedProfiles', () => {
  it('no folder: none, and nothing is created', async () => {
    expect(await listSavedProfiles()).toEqual([]);
    expect(mockCreated).toEqual([]);
  });

  it('lists only readable files, newest first', async () => {
    mockFiles.set(PRODUCTION, saved('Production', '2026-11-01T09:00:00Z'));
    mockFiles.set(`${FOLDER}/work.json`, saved('Work', '2026-11-03T09:00:00Z'));
    mockFiles.set(`${FOLDER}/broken.json`, '{"name": ');
    mockFiles.set(`${FOLDER}/Bad Name.json`, saved('Bad', '2026-11-04T09:00:00Z'));
    mockFiles.set(`${FOLDER}/notes.txt`, 'x');
    const list = await listSavedProfiles();
    expect(list.map(p => p.id)).toEqual(['work', 'production']);
    expect(list[0]).toEqual({id: 'work', name: 'Work', savedAt: '2026-11-03T09:00:00.000Z'});
    expect(mockCreated).toEqual([]);
  });
});

it('the debug bundle says whether Kept runs on fresh settings', () => {
  expect(summarizeSettings(DEFAULT_SETTINGS)[0]).toContain('fresh start no');
  expect(summarizeSettings({...DEFAULT_SETTINGS, freshStart: true})[0]).toContain('fresh start yes');
});
