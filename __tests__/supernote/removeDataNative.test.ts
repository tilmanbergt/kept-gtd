// docs/dev/history/technical-design-remove-data.md §4, §6 scenario 10: the native deletes for
// Remove Kept's data refuse every path outside Kept's own folders and every file name Kept doesn't
// write. The fake module mirrors GtdParaFileModule.kt's rules; the wrappers report a refusal.
import {NativeModules} from 'react-native';
import {FakeFs} from '../../test-helpers/fakeDevice/fakeFs';

jest.mock('sn-plugin-lib', () => ({NativePluginManager: {}, PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

const fake = new FakeFs();
NativeModules.GtdParaFile = fake.module;

// Loaded after the fake is in place: fileNative reads NativeModules once.
const {deleteKeptFile, deleteKeptTree} = require('../../src/supernote/fileSystem') as typeof import('../../src/supernote/fileSystem');

const S = '/storage/emulated/0';

beforeEach(() => {
  fake.put(`${S}/EXPORT/kept-gtd/debug/kept-gtd-log.txt`, 'log');
  fake.put(`${S}/EXPORT/kept-gtd/profiles/production.json`, '{}');
  fake.put(`${S}/Note/kept-gtd-demo/1 Projects/Garden/project.txt`, 'demo');
  fake.put(`${S}/Note/1 Projects/Garden renovation/project.txt`, 'real');
  fake.put(`${S}/Note/1 Projects/Garden renovation/.project.txt.gtdpara-tmp`, 'half');
  fake.put(`${S}/Note/1 Projects/Garden renovation/Garden renovation 2026.note`, 'handwriting');
  fake.put(`${S}/Document/Book.pdf`, 'pdf');
});

describe('deleteKeptTree', () => {
  it('deletes a folder inside Kept\'s export folder and leaves its siblings', async () => {
    await deleteKeptTree(`${S}/EXPORT/kept-gtd/debug`);
    expect(fake.exists(`${S}/EXPORT/kept-gtd/debug`)).toBe(false);
    expect(fake.exists(`${S}/EXPORT/kept-gtd/profiles/production.json`)).toBe(true);
  });

  it('deletes the demo space', async () => {
    await deleteKeptTree(`${S}/Note/kept-gtd-demo`);
    expect(fake.paths(`${S}/Note/kept-gtd-demo`)).toEqual([]);
  });

  it.each([`${S}/Note`, `${S}/Note/1 Projects`, `${S}/EXPORT`, `${S}/EXPORT/kept-gtd-other`, `${S}/EXPORT/kept-gtd/../../Note`, `${S}/Document`])(
    'refuses %s and changes nothing',
    async path => {
      await expect(deleteKeptTree(path)).rejects.toMatchObject({code: 'E_NOT_KEPT'});
      expect(fake.exists(`${S}/Note/1 Projects/Garden renovation/project.txt`)).toBe(true);
      expect(fake.exists(`${S}/Document/Book.pdf`)).toBe(true);
    },
  );
});

describe('deleteKeptFile', () => {
  it('deletes a project.txt and a leftover save copy, and keeps the note beside them', async () => {
    await deleteKeptFile(`${S}/Note/1 Projects/Garden renovation/project.txt`);
    await deleteKeptFile(`${S}/Note/1 Projects/Garden renovation/.project.txt.gtdpara-tmp`);
    expect(fake.exists(`${S}/Note/1 Projects/Garden renovation/project.txt`)).toBe(false);
    expect(fake.exists(`${S}/Note/1 Projects/Garden renovation/Garden renovation 2026.note`)).toBe(true);
  });

  it.each([
    `${S}/Note/1 Projects/Garden renovation/Garden renovation 2026.note`,
    `${S}/Document/Book.pdf`,
    `${S}/Note/1 Projects/Garden renovation`,
    '/data/user/0/project.txt',
    `${S}/Note/../../data/project.txt`,
  ])('refuses %s', async path => {
    await expect(deleteKeptFile(path)).rejects.toMatchObject({code: expect.stringMatching(/^E_NOT_(KEPT|FILE)$/)});
    expect(fake.exists(`${S}/Note/1 Projects/Garden renovation/Garden renovation 2026.note`)).toBe(true);
  });
});
