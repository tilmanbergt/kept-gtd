// docs/dev/history/technical-design-engage-page-owner.md §3.3, §6.2 scenario 13: the section lookup over the page
// index, an own note without a read, and the single-page fallback when the index can't be read.
let mockIndex: {keywords: Array<{page: number; keyword: string}>; titles: Array<{page: number; y: number; rect: object; trail: number[]}>} | null = null;
const mockLoadPageIndex = jest.fn(async (_path: string) => {
  if (!mockIndex) throw new Error('no note');
  return {mtimeMs: 1, totalPages: 9, ...mockIndex};
});
let mockKeywords: Array<{page: number; keyword: string}> = [];
jest.mock('../../src/supernote/noteFileApi', () => ({
  getKeyWords: async () => mockKeywords,
}));
jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));

import {pageSectionOf} from '../../src/storage/pageSection';
import {PageIndexReader} from '../../src/storage/notebookPages';
import {logWarn} from '../../src/utils/log';
import {meeting, task} from '../../test-helpers/fixtures';

const AREA = '/Note/2 Areas/Sport';
const FILE = `${AREA}/Sport 2026.note`;
const ref = {kind: 'area' as const, name: 'Sport', path: AREA};
const coach = meeting('2026-10-14', 'Coach call', {notePath: 'Sport 2026.note#2026-10-14 Coach call'});
const reader = {loadPageIndex: (p: string) => mockLoadPageIndex(p), headingTextOf: async () => 'Training plan'} as unknown as PageIndexReader;
const sources = [{ref, tasks: [task('Brief', {notePath: 'Todos/Brief.note'})], meetings: [coach]}];

beforeEach(() => {
  mockIndex = null;
  mockKeywords = [];
  jest.clearAllMocks();
});

describe('pageSectionOf', () => {
  it('an own note: the entry, no index read', async () => {
    const found = await pageSectionOf(`${AREA}/Todos/Brief.note`, 3, sources, reader);
    expect(found).toMatchObject({section: {page: 3, claim: {kind: 'entry', entry: {kind: 'task'}}}, distance: 0, ownNote: true, indexRead: false});
    expect(mockLoadPageIndex).not.toHaveBeenCalled();
  });
  it('walks back to the meeting page, or to a heading with its text', async () => {
    mockIndex = {keywords: [{page: 0, keyword: 'home'}, {page: 3, keyword: '2026-10-14 Coach call'}], titles: [{page: 6, y: 80, rect: {}, trail: []}]};
    expect(await pageSectionOf(FILE, 4, sources, reader)).toMatchObject({section: {page: 3, claim: {kind: 'entry', entry: {kind: 'meeting'}}}, distance: 1, indexRead: true});
    expect(await pageSectionOf(FILE, 2, sources, reader)).toMatchObject({section: {page: 0, claim: {kind: 'home'}}, distance: 2});
    expect(await pageSectionOf(FILE, 7, sources, reader)).toMatchObject({section: {page: 6, claim: {kind: 'heading'}}, distance: 1, headingText: 'Training plan'});
  });
  it('no section page before it: null', async () => {
    mockIndex = {keywords: [], titles: []};
    expect(await pageSectionOf(FILE, 4, sources, reader)).toMatchObject({section: null, distance: 0, indexRead: true});
  });
  it('the index can\'t be read: the single-page lookup, logged (scenario 13)', async () => {
    mockKeywords = [{page: 3, keyword: '2026-10-14 Coach call'}];
    expect(await pageSectionOf(FILE, 3, sources, reader)).toMatchObject({section: {page: 3, claim: {kind: 'entry'}}, distance: 0, indexRead: false});
    expect(await pageSectionOf(FILE, 4, sources, reader)).toMatchObject({section: null, indexRead: false});
    expect(logWarn).toHaveBeenCalledWith('pageSection: index not read', 'no note');
  });
  it('without an index reader: the single-page lookup', async () => {
    mockIndex = {keywords: [{page: 3, keyword: '2026-10-14 Coach call'}], titles: []};
    expect(await pageSectionOf(FILE, 4, sources, null)).toMatchObject({section: null, indexRead: false});
    expect(mockLoadPageIndex).not.toHaveBeenCalled();
  });
});
