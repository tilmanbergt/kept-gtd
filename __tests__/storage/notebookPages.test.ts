// docs/dev/history/technical-design-engage-page-owner.md §3.1, §6.2 scenarios 14 and 15: one page index per file and
// modification time, shared by the Notebook tab's Contents, Engage and Capture.
jest.mock('sn-plugin-lib', () => ({PluginCommAPI: {recycleElement: jest.fn()}, PluginFileAPI: {}}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
let mockMtime: number | null = 1;
const mockGetElements = jest.fn(async (page: number, _path: string) =>
  page === 1 ? [{numInPage: 2, textBox: {textContentFull: 'Training plan\nweek 1', textRect: {left: 0, top: 100, right: 500, bottom: 160}}}] : [],
);
jest.mock('../../src/supernote/fileSystem', () => ({
  statFiles: async (paths: string[]) => paths.map(path => (mockMtime === null ? {path, exists: false, lastModified: 0, size: -1} : {path, exists: true, lastModified: mockMtime, size: 1})),
}));
jest.mock('../../src/supernote/noteFileApi', () => ({
  getElements: (page: number, path: string) => mockGetElements(page, path),
}));
const mockGetTitles = jest.fn(async (_path: string, _pages: number[]) => [
  {page: 1, X: 0, Y: 300, width: 500, height: 60, style: 3, controlTrailNums: [7]},
  {page: 1, X: 0, Y: 100, width: 500, height: 60, style: 3, controlTrailNums: [2]},
  {page: 2, X: 0, Y: 100, width: 500, height: 60, style: 3, controlTrailNums: []},
]);
jest.mock('../../src/supernote/noteTitles', () => ({getTitles: (p: string, pages: number[]) => mockGetTitles(p, pages)}));
const mockReadAllKeywords = jest.fn(async (_path: string) => ({keywords: [{page: 0, keyword: 'home'}], totalPages: 3}));
jest.mock('../../src/storage/sharedNotePages', () => ({readAllKeywords: (p: string) => mockReadAllKeywords(p)}));

import {loadContents} from '../../src/storage/notebookContents';
import {cachedPageIndexCount, headingTextOf, headingTextsOf, loadPageIndex} from '../../src/storage/notebookPages';
import {log} from '../../src/utils/log';

const PATH = '/n/Sport 2026.note';

beforeEach(() => {
  mockMtime = 1;
  jest.clearAllMocks();
});

describe('loadPageIndex', () => {
  it('reads keywords and titles once per modification time (scenario 14: hit, then miss after an edit)', async () => {
    const first = await loadPageIndex(PATH);
    expect(first).toMatchObject({mtimeMs: 1, totalPages: 3, keywords: [{page: 0, keyword: 'home'}]});
    expect(first.titles.map(t => [t.page, t.y, t.trail])).toEqual([[1, 300, [7]], [1, 100, [2]], [2, 100, []]]);
    expect(await loadPageIndex(PATH)).toBe(first);
    expect(mockGetTitles).toHaveBeenCalledTimes(1);
    expect(mockReadAllKeywords).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('NotebookPages: index hit', '3 pages', expect.stringMatching(/ ms$/));

    mockMtime = 2;
    expect((await loadPageIndex(PATH)).mtimeMs).toBe(2);
    expect(mockGetTitles).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith('NotebookPages: index miss', '3 pages', '1 keywords', '3 titles', expect.stringMatching(/ ms$/));
  });

  it('never caches a file whose modification time is unknown', async () => {
    mockMtime = null;
    await loadPageIndex('/n/Gone.note');
    await loadPageIndex('/n/Gone.note');
    expect(mockGetTitles).toHaveBeenCalledTimes(2);
    expect(cachedPageIndexCount()).toBe(1);
  });
});

describe('headingTextsOf', () => {
  it('reads a page\'s elements once and memoizes the texts with the index', async () => {
    const index = await loadPageIndex(PATH);
    expect(await headingTextsOf(PATH, index, 1)).toEqual([null, 'Training plan\nweek 1']);
    expect(await headingTextOf(PATH, index, 1)).toBe('Training plan\nweek 1');
    expect(await headingTextOf(PATH, index, 2)).toBeNull();
    expect(await headingTextOf(PATH, index, 0)).toBeNull();
    expect(mockGetElements.mock.calls.map(c => c[0])).toEqual([1, 2]);
  });
});

describe('Contents on the page index (scenario 15)', () => {
  it('shares the read with the index: no second getTitles, typed and handwritten headings as before', async () => {
    mockMtime = 5;
    await loadPageIndex(PATH);
    const entries = await loadContents(PATH, {name: 'Sport', tasks: [], meetings: []});
    expect(entries.map(e => [e.page, e.text, e.source])).toEqual([
      [0, 'Sport', 'home'],
      [1, 'Training plan', 'typed'],
      [1, 'Handwritten heading', 'handwritten'],
      [2, 'Handwritten heading', 'handwritten'],
    ]);
    expect(mockGetTitles).toHaveBeenCalledTimes(1);
  });
});
