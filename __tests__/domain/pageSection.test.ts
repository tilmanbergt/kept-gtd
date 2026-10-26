// docs/dev/history/technical-design-engage-page-owner.md §3.2, §3.4, §3.7: what claims a page, the walk back to the
// section page, the home notebook check and the section's title.
import {notePageCandidates, PageEntrySource} from '../../src/domain/notePageEntry';
import {claimOfPage, isHomeNotebookFile, PageClaimInput, sectionOfPage, sectionTitleOf} from '../../src/domain/pageSection';
import {meetingPageKeyword} from '../../src/domain/sharedNotePages';
import {reflectionKeyword} from '../../src/domain/reflection';
import {meeting, task} from '../../test-helpers/fixtures';

const AREA = '/Note/2 Areas/Sport';
const FILE = `${AREA}/Sport 2026.note`;
const ref = {kind: 'area' as const, name: 'Sport', path: AREA};
const coach = meeting('2026-10-14', 'Coach call', {notePath: `Sport 2026.note#${meetingPageKeyword({date: '2026-10-14', title: 'Coach call'})}`});
const runs = task('Plan long runs #loop/marathon', {notePath: 'Sport 2026.note#Plan long runs #loop/marathon'});
const shoes = task('Buy shoes', {notePath: 'Sport 2026.note#Buy shoes', cancelled: true});
const linked = task('Stretching', {notePath: 'Sport 2026.note#page=12'});
const sources: Array<PageEntrySource<typeof ref>> = [{ref, tasks: [runs, shoes, linked], meetings: [coach]}];

function inputFor(keywords: Array<[number, string]>, titles: Array<[number, number]>): PageClaimInput<typeof ref> {
  const all = notePageCandidates(FILE, 0, sources, undefined, {includeCancelled: true});
  return {keywords: keywords.map(([page, keyword]) => ({page, keyword})), titles: titles.map(([page, y]) => ({page, y})), pageLinks: all.pageLinks, sharedCandidates: all.shared};
}

describe('notePageCandidates options', () => {
  it('leaves cancelled entries out by default and lists every page link', () => {
    const plain = notePageCandidates(FILE, 3, sources);
    expect(plain.shared.map(c => c.keyword)).toEqual([meetingPageKeyword(coach), 'Plan long runs #loop/marathon']);
    expect(plain.pageLinks.map(l => l.page)).toEqual([11]);
    expect(plain.ownNote).toBe(false);
    const all = notePageCandidates(FILE, 3, sources, undefined, {includeCancelled: true});
    expect(all.shared.map(c => c.keyword)).toContain('Buy shoes');
  });
  it('an own note is marked as such', () => {
    const own = task('Brief', {notePath: 'Todos/Brief.note'});
    expect(notePageCandidates(`${AREA}/Todos/Brief.note`, 2, [{ref, tasks: [own], meetings: []}]).ownNote).toBe(true);
  });
});

describe('claimOfPage', () => {
  const input = inputFor(
    [
      [0, 'home'],
      [2, '2026-10-14'],
      [2, meetingPageKeyword(coach)],
      [4, 'Plan long runs #loop/marathon'],
      [6, 'Training'],
      [9, 'Buy shoes'],
      [13, 'loop loop/marathon'],
      [14, reflectionKeyword(coach)],
    ],
    [
      [0, 50],
      [2, 50],
      [6, 400],
      [6, 120],
      [8, 300],
    ],
  );
  it('a page link, an entry keyword, home, a loop page, a heading - in that order', () => {
    expect(claimOfPage(0, input)).toEqual({kind: 'home'});
    expect(claimOfPage(2, input)).toMatchObject({kind: 'entry', entry: {kind: 'meeting', meetingIndex: 0}, cancelled: false, reflection: false});
    expect(claimOfPage(4, input)).toMatchObject({kind: 'entry', entry: {kind: 'task', taskIndex: 0}, cancelled: false});
    expect(claimOfPage(6, input)).toEqual({kind: 'heading', y: 120});
    expect(claimOfPage(8, input)).toEqual({kind: 'heading', y: 300});
    expect(claimOfPage(11, input)).toMatchObject({kind: 'entry', entry: {kind: 'task', taskIndex: 2}});
    expect(claimOfPage(13, input)).toEqual({kind: 'loop', tag: 'loop/marathon'});
    expect(claimOfPage(1, input)).toBeNull();
    expect(claimOfPage(3, input)).toBeNull();
  });
  it('a cancelled todo\'s page still claims, marked cancelled (P8)', () => {
    expect(claimOfPage(9, input)).toMatchObject({kind: 'entry', entry: {kind: 'task', taskIndex: 1}, cancelled: true});
  });
  it('a meeting\'s Reflection page is the meeting\'s, marked as reflection', () => {
    expect(claimOfPage(14, input)).toMatchObject({kind: 'entry', entry: {kind: 'meeting'}, reflection: true});
  });
});

describe('sectionOfPage', () => {
  const claims: Record<number, {kind: 'home'} | {kind: 'heading'; y: number}> = {0: {kind: 'home'}, 5: {kind: 'heading', y: 10}};
  const claimAt = (page: number) => claims[page] ?? null;
  it('the page itself, else the nearest earlier page with a claim, else null', () => {
    expect(sectionOfPage(0, claimAt)).toEqual({page: 0, claim: {kind: 'home'}});
    expect(sectionOfPage(3, claimAt)).toEqual({page: 0, claim: {kind: 'home'}});
    expect(sectionOfPage(9, claimAt)).toEqual({page: 5, claim: {kind: 'heading', y: 10}});
    expect(sectionOfPage(4, () => null)).toBeNull();
  });
});

describe('isHomeNotebookFile', () => {
  const base = {itemPath: AREA, itemAbbrev: 'Sp', notebook: {name: '{name} {year}', folder: ''}, today: '2026-10-25'};
  it('this year\'s and an earlier year\'s file in the Default notebook folder', () => {
    expect(isHomeNotebookFile({...base, absPath: FILE})).toBe(true);
    expect(isHomeNotebookFile({...base, absPath: `${AREA}/Sport 2024.note`})).toBe(true);
  });
  it('not another name, another folder, or without a Default notebook', () => {
    expect(isHomeNotebookFile({...base, absPath: `${AREA}/2026-11 loop marathon.note`})).toBe(false);
    expect(isHomeNotebookFile({...base, absPath: `${AREA}/Notes/Sport 2026.note`})).toBe(false);
    expect(isHomeNotebookFile({...base, notebook: {name: '{name} {year}', folder: 'Notes'}, absPath: `${AREA}/Notes/Sport 2026.note`})).toBe(true);
    expect(isHomeNotebookFile({...base, notebook: null, absPath: FILE})).toBe(false);
  });
});

describe('sectionTitleOf', () => {
  const at = {ownerName: 'Sport', headingText: null, today: '2026-10-25'};
  it('labels every kind of section page (P9)', () => {
    expect(sectionTitleOf({kind: 'home'}, at)).toEqual({text: 'Sport', detail: ''});
    expect(sectionTitleOf({kind: 'loop', tag: 'loop/marathon'}, at)).toEqual({text: 'loop marathon', detail: ''});
    expect(sectionTitleOf({kind: 'heading', y: 1}, {...at, headingText: 'Training plan\nweek 1'})).toEqual({text: 'Training plan', detail: ''});
    expect(sectionTitleOf({kind: 'heading', y: 1}, at)).toEqual({text: 'Handwritten section', detail: ''});
    const entry = {kind: 'meeting' as const, item: ref, meetingIndex: 0, meeting: coach};
    expect(sectionTitleOf({kind: 'entry', entry, cancelled: false, reflection: false}, at)).toEqual({text: 'Coach call', detail: '14.10.'});
    expect(sectionTitleOf({kind: 'entry', entry, cancelled: false, reflection: true}, at)).toEqual({text: 'Reflection · Coach call', detail: '14.10.'});
    const todo = {kind: 'task' as const, item: ref, taskIndex: 0, task: runs};
    expect(sectionTitleOf({kind: 'entry', entry: todo, cancelled: false, reflection: false}, at).text).toBe('Plan long runs loop/marathon');
  });
});
