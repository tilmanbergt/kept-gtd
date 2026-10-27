// docs/dev/history/technical-design-perf-current-page.md §6 scenario 1, §7: golden master of the Current
// page. The visible texts and the rows every paged list is handed were recorded once, before the
// performance changes, into __golden__/currentPage.json; every later step keeps them unchanged.
// Recording (only for a new data set, never for a changed result):
//   GOLDEN_WRITE=1 npx jest --selectProjects scenarios __tests__/scenarios/currentPageGolden.test.tsx
import * as fs from 'fs';
import * as path from 'path';
import {screen} from '@testing-library/react-native';
import {openApp, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {putFile} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {BIG_NOW, bigScopeFiles, bigScopeSettings} from '../../test-helpers/bigScope';
import {fixedClock} from '../../test-helpers/scenario/clock';

const GOLDEN = path.join(__dirname, '__golden__', 'currentPage.json');

const clock = () => fixedClock(BIG_NOW);
afterEach(() => jest.useRealTimers());

/** A row as a list holds it: its own plain fields and the entry it shows, without object identity. */
function rowOut(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
  }
  const r = row as {task?: {text: string; done: boolean}; meeting?: {date: string; title: string}; entry?: {counterpart?: {leaf: string}; task?: {text: string}}};
  if (r.task) out.task = `${r.task.done ? 'x ' : ''}${r.task.text}`;
  if (r.meeting) out.meeting = `${r.meeting.date} ${r.meeting.title}`;
  if (r.entry?.counterpart) out.counterpart = r.entry.counterpart.leaf;
  if (r.entry?.task) out.task = r.entry.task.text;
  return out;
}

/** What the page shows: visible texts, and per paged list its header and every row it is handed. */
function pageState(): {texts: string[]; lists: Array<{header: unknown; rows: Array<Record<string, unknown>>}>} {
  const lists = screen.UNSAFE_root.findAll(n => Array.isArray(n.props.rows) && 'renderRow' in n.props, {deep: true})
    .filter((n, i, all) => all.findIndex(m => m.props === n.props) === i)
    .map(n => ({header: typeof n.props.header === 'string' ? n.props.header : '(element)', rows: (n.props.rows as Array<Record<string, unknown>>).map(rowOut)}));
  return {texts: texts().filter(t => t.trim() !== ''), lists};
}

const recorded: Record<string, unknown> = {};
function check(name: string): void {
  const now = JSON.parse(JSON.stringify(pageState()));
  if (process.env.GOLDEN_WRITE === '1') {
    recorded[name] = now;
    return;
  }
  const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
  expect(now).toEqual(golden[name]);
}
afterAll(() => {
  if (process.env.GOLDEN_WRITE !== '1') return;
  fs.mkdirSync(path.dirname(GOLDEN), {recursive: true});
  fs.writeFileSync(GOLDEN, JSON.stringify(recorded, null, 1) + '\n');
});

scenario('The Current pages of the big data set show what was recorded before the performance work', {feature: 'Projects and Areas', design: 'technical-design-perf-current-page.md'}, () => {
  given('the big data set: area "Atruvia" with projects "Tender" and "Migration", area "Zen", project "Solo" and the Inbox', () => {
    clock();
    for (const f of bigScopeFiles()) putFile(f.path, f.content);
  });
  when('I open Atruvia\'s page', async () => {
    await openApp({settings: bigScopeSettings()});
    await tapTab('Areas');
    await tap(/^Atruvia/);
  });
  then('it shows the recorded texts and list rows, also on each Quick Add tab', async () => {
    check('atruvia');
    for (const tab of ['Meeting', 'Agreement', 'Note', 'Todo']) {
      await tap(tab);
      check(`atruvia:${tab}`);
    }
  });
  when('I open Zen\'s page', async () => {
    await tapTab('Areas');
    await tap(/^Zen/);
  });
  then('it shows the recorded texts and list rows', () => check('zen'));
  when('I open project Tender (in Atruvia) and project Solo', async () => {
    await tapTab('Projects');
    await tap(/^Tender/);
    check('tender');
    await tapTab('Projects');
    await tap(/^Solo/);
  });
  then('both show the recorded texts and list rows', () => check('solo'));
});
