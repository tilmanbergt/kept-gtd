import * as fs from 'fs';
import * as path from 'path';
import {screen} from '@testing-library/react-native';
import {createNoteSetup, seedNoteSetupDefaults} from '../../src/domain/noteSetups';
import {GtdParaSettings} from '../../src/domain/settings';
import {rosterCountsText, rosterMeetingText} from '../../src/domain/threadText';
import {RosterEntry} from '../../src/storage/tendingRoster';
import {describeScreen, expectShows, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {device} from '../../test-helpers/fakeDevice/device';
import {BIG_NOW, BIG_SETUP_TAGS, bigDay, bigScopeFiles} from '../../test-helpers/bigScope';
import {fixedClock} from '../../test-helpers/scenario/clock';

// docs/dev/history/technical-design-perf-threads.md §6 scenarios 1, 6 and 7 on the fake device: the big
// Area's Threads tab shows what the golden master recorded (same files, same clock), follows an edit,
// and builds its roster once per open.

const clock = () => fixedClock(BIG_NOW);
afterEach(() => jest.useRealTimers());

function bigSettings(): Partial<GtdParaSettings> {
  const noteSetups = BIG_SETUP_TAGS.map((s, i) => ({...createNoteSetup(`b${i}`, s.kind), name: s.name, tags: [s.tag]}));
  return {noteSetups, noteSetupDefaults: seedNoteSetupDefaults(), nextNoteSetupId: noteSetups.length + 1, noteSetupsMigrated: true};
}

/** The big data set on the device; `edit` may change a file's text first. */
function putBigScope(edit: (name: string, content: string) => string = (_n, c) => c): void {
  for (const f of bigScopeFiles()) putFile(f.path, edit(f.name, f.content));
}

async function openAtruvia(): Promise<void> {
  await openApp({settings: bigSettings()});
  await tapTab('Areas');
  await tap(/^Team/);
}

/** The roster entries the Threads list was handed, in row order (the list pages them on the device). */
function threadEntries(): RosterEntry[] {
  const list = screen.UNSAFE_root.findAll(n => n.props.header === 'Threads' && Array.isArray(n.props.rows))[0];
  if (!list) throw new Error(`no Threads list; the screen shows: ${describeScreen()}`);
  return list.props.rows.filter((row: {entry?: RosterEntry}) => row.entry).map((row: {entry: RosterEntry}) => row.entry);
}

const signals = (e: Pick<RosterEntry, 'lastMeeting' | 'nextMeeting' | 'oweCount' | 'waitingCount' | 'oldestWaitingDays'> & {leaf: string; status: string}) =>
  `${e.leaf} ${e.status} last ${e.lastMeeting} next ${e.nextMeeting} owe ${e.oweCount} w/f ${e.waitingCount}/${e.oldestWaitingDays}`;
const rosterLines = (entries: RosterEntry[]) => entries.map(e => signals({...e, leaf: e.counterpart.leaf, status: e.counterpart.status}));

interface GoldenEntry {leaf: string; status: string; lastMeeting: string | null; nextMeeting: string | null; oweCount: number; waitingCount: number; oldestWaitingDays: number | null}
/** The scope roster the golden master recorded (__tests__/storage/bigScopeGolden.test.ts). */
function goldenRoster(): {confirm: GoldenEntry[]; active: GoldenEntry[]; inactive: GoldenEntry[]} {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'storage', '__golden__', 'bigScope.json'), 'utf8')).scopeRoster;
}
const goldenLines = () => {
  const scope = goldenRoster();
  return [...scope.confirm, ...scope.active, ...scope.inactive].map(signals);
};

const rosterBuilds = () => device().logs.filter(l => l.text.startsWith('tendingRoster: built')).length;

scenario('A big Area\'s Threads tab shows the same counterparts and signals as before, built once', {feature: 'Threads', design: 'technical-design-perf-threads.md'}, () => {
  given('area "Team" with 2 projects, 26 counterparts, 133 meetings and 97 todos (half agreed in a meeting, some in the Inbox and in area "Zen", two with a renamed meeting)', () => {
    clock();
    putBigScope();
  });
  when('I open Team\'s page', openAtruvia);
  and('I unfold the inactive counterparts', () => tap(/^\d+ inactive ▸$/));
  then('the Threads tab lists New, Active and Inactive counterparts with the recorded last/next, I-owe and Waiting', () => {
    expect(rosterLines(threadEntries())).toEqual(goldenLines());
    expectShows('New');
    expectShows('Active');
    const first = goldenRoster().active[0];
    const counts = rosterCountsText(first);
    const meetingText = rosterMeetingText(first, null, bigDay(0));
    expectShows(counts ? `${meetingText} · ${counts}` : meetingText);
  });
  and('the roster was built once for this open', () => {
    expect(rosterBuilds()).toBe(1);
  });
});

scenario('Renaming a meeting in Quick Add updates the Threads tab of the big Area', {feature: 'Threads', design: 'technical-design-perf-threads.md'}, () => {
  const meetingDay = bigDay(9);
  given('area "Team" of the big data set also has a todo agreed in "1:1 Ines" on a day only "1:1 Vera" has a meeting', () => {
    clock();
    putBigScope((name, content) =>
      name === 'Team' ? content.replace('## Tasks\n\n', `## Tasks\n\n- [ ] Ines: book the room [meeting:: ${meetingDay} 1:1 Ines 101/ines]\n`) : content,
    );
  });
  when('I open Team\'s page', openAtruvia);
  then('Ines has no next meeting and owes nothing', () => {
    const ines = threadEntries().find(e => e.counterpart.leaf === 'ines')!;
    expect([ines.nextMeeting, ines.oweCount]).toEqual([null, 0]);
  });
  when('I rename that meeting to "1:1 Ines #101/ines" in Quick Add', async () => {
    await tap(/^1:1 Vera/);
    await tap('Edit');
    await type('New meeting title', '1:1 Ines #101/ines');
    await tap('Save');
  });
  then('the file has the new title', () => {
    expect(sectionLines(`${bigScopeFiles().find(f => f.name === 'Team')!.path}`, 'Meetings')).toContain(`- ${meetingDay} 10:00-11:00 1:1 Ines #101/ines`);
  });
  and('Ines shows the meeting as next, and the todo agreed in it as one more I-owe', () => {
    const ines = threadEntries().find(e => e.counterpart.leaf === 'ines')!;
    expect([ines.nextMeeting, ines.oweCount]).toEqual([meetingDay, 1]);
  });
});
