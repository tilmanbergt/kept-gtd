// docs/dev/history/technical-design-tending-threads.md §3.4, D11, D12, D14: provenance key, line and resolution.
jest.mock('sn-plugin-lib', () => ({PluginManager: {}}));
jest.mock('../../src/supernote/fileSystem', () => ({}));
import {deriveMeetingFields, parseTasksSpan, serializeTaskLine} from '../../src/domain/markdown';
import {buildTask} from '../../src/storage/itemMutations';
import {__provenanceStatsForTests, applyProvenance, meetingKey, normalizeMeetingKey, provenanceLabel, resolveProvenance} from '../../src/domain/provenance';
import {meetingPageKeyword} from '../../src/domain/sharedNotePages';
import {emptyTaskFields} from '../../src/domain/taskLine';
import {Meeting} from '../../src/domain/types';
import {meeting, task} from '../../test-helpers/fixtures';

function m(date: string, title: string, extra: Partial<Meeting> = {}): Meeting {
  return meeting(date, title, {...deriveMeetingFields(title), ...extra});
}

const retro = m('2026-09-30', 'Retro alpha #retro/alpha #reviewed');

describe('meetingKey', () => {
  it('is the page keyword without state tags', () => {
    expect(meetingKey(retro)).toBe('2026-09-30 Retro alpha retro/alpha');
  });
  it('drops "#" but keeps the tag text, so Obsidian sees no tags in the field', () => {
    const jordan = m('2026-10-08', '1:1 Jordan #mh #101/jordan');
    expect(meetingKey(jordan)).toBe('2026-10-08 1:1 Jordan mh 101/jordan');
    const line = applyProvenance('Send agenda', meetingKey(jordan));
    expect(line).toBe('Send agenda [meeting:: 2026-10-08 1:1 Jordan mh 101/jordan]');
    expect(buildTask(line, {today: '2026-10-08'}).tags).toEqual([]);
  });
  it('leaves out brackets so the field stays one token', () => {
    expect(meetingKey(m('2026-09-30', 'Plan [draft]'))).toBe('2026-09-30 Plan draft');
  });
});

describe('applyProvenance', () => {
  it('sets only the meeting field, before other fields, and adds no tags', () => {
    expect(applyProvenance('Send notes #next [due:: 2026-10-09]', meetingKey(retro))).toBe(
      'Send notes #next [meeting:: 2026-09-30 Retro alpha retro/alpha] [due:: 2026-10-09]',
    );
  });
  it('keeps the tags the user typed, also those of another thread', () => {
    const jordan = m('2026-09-30', '1:1 Jordan #101/jordan');
    expect(applyProvenance('Raise budget question #101/sam', meetingKey(jordan))).toBe(
      'Raise budget question #101/sam [meeting:: 2026-09-30 1:1 Jordan 101/jordan]',
    );
  });
  it('round-trips through buildTask and the task line writer', () => {
    const line = applyProvenance('Send notes', meetingKey(retro));
    const built = buildTask(line, {today: '2026-10-08'});
    expect(built.text).toBe('Send notes');
    expect(built.tags).toEqual([]);
    expect(built.fields.meeting).toBe('2026-09-30 Retro alpha retro/alpha');
    expect(serializeTaskLine(built)).toBe(
      '- [ ] Send notes [meeting:: 2026-09-30 Retro alpha retro/alpha] [created:: 2026-10-08]',
    );
    expect(parseTasksSpan(`## Tasks\n${serializeTaskLine(built)}\n`).tasks[0].fields.meeting).toBe(built.fields.meeting);
  });
});

describe('provenanceLabel', () => {
  it('names the meeting and its day, nothing else', () => {
    expect(provenanceLabel(retro, '2026-10-08')).toBe('↳ from Retro alpha · Wed 30.9.');
    expect(provenanceLabel(m('2026-09-30', 'Kickoff #client'), '2026-10-08')).toBe('↳ from Kickoff · Wed 30.9.');
  });
});

describe('resolveProvenance', () => {
  const agreed = (key: string, text = 'Send notes #retro/alpha') =>
    task(text, {fields: {...emptyTaskFields(), meeting: key}});

  it('finds the exact meeting, preferring the scope', () => {
    const sources = [
      {path: '/other', meetings: [retro]},
      {path: '/area', meetings: [m('2026-09-23', 'Retro alpha #retro/alpha'), retro]},
    ];
    expect(resolveProvenance(agreed(meetingKey(retro)), sources, ['/area'])).toMatchObject({path: '/area', meetingIndex: 1, exact: true});
    expect(resolveProvenance(agreed(meetingKey(retro)), sources, [])).toMatchObject({path: '/other', meetingIndex: 0, exact: true});
  });

  it('tells two same-titled meetings on one day apart by their tags', () => {
    const a = m('2026-10-08', '1:1 #101/jordan');
    const b = m('2026-10-08', '1:1 #101/tom');
    expect(meetingKey(a)).not.toBe(meetingKey(b));
    const sources = [{path: '/area', meetings: [a, b]}];
    expect(resolveProvenance(agreed(meetingKey(b), 'Follow up #101/tom'), sources, ['/area'])).toMatchObject({meetingIndex: 1, exact: true});
    expect(resolveProvenance(agreed(meetingKey(a), 'Follow up #101/jordan'), sources, ['/area'])).toMatchObject({meetingIndex: 0, exact: true});
  });

  it('matches a hand-written key that still has "#"', () => {
    const sources = [{path: '/area', meetings: [retro]}];
    expect(resolveProvenance(agreed('2026-09-30 Retro alpha #retro/alpha'), sources, ['/area'])).toMatchObject({exact: true});
  });

  it('falls back to the date and the meeting\'s thread tags found in the key after a rename', () => {
    const renamed = m('2026-09-30', 'Sprint retro #retro/alpha');
    const sources = [{path: '/area', meetings: [m('2026-09-30', 'Other #review/beta'), renamed]}];
    expect(resolveProvenance(agreed('2026-09-30 Retro alpha retro/alpha'), sources, ['/area'])).toMatchObject({
      meetingIndex: 1,
      exact: false,
    });
  });

  it('does not consult the todo\'s own tags for the fallback', () => {
    const renamed = m('2026-09-30', '1:1 #101/jordan');
    const sources = [{path: '/area', meetings: [m('2026-09-30', 'Sync #101/sam'), renamed]}];
    // Agreed with Jordan, to be raised with Sam: the key names Jordan's thread, the tag Sam's.
    const raised = agreed('2026-09-30 1:1 Jordan 101/jordan', 'Raise budget #101/sam');
    expect(resolveProvenance(raised, sources, ['/area'])).toMatchObject({meetingIndex: 1, exact: false});
    // A key without thread tags has no fallback, whatever the todo is tagged with.
    expect(resolveProvenance(agreed('2026-09-30 1:1 Jordan', 'Raise budget #101/jordan'), sources, ['/area'])).toBeNull();
  });

  it('matches a deeper tag in the key to the meeting\'s thread', () => {
    const sources = [{path: '/area', meetings: [m('2026-09-30', 'Renamed #retro/alpha')]}];
    expect(resolveProvenance(agreed('2026-09-30 Retro retro/alpha/2026'), sources, ['/area'])).toMatchObject({exact: false});
  });

  it('is unresolved without a match', () => {
    const sources = [{path: '/area', meetings: [m('2026-09-30', 'Other #review/beta')]}];
    expect(resolveProvenance(agreed('2026-09-30 Retro alpha #retro/alpha'), sources, ['/area'])).toBeNull();
    expect(resolveProvenance(agreed('2026-09-30 Retro alpha', 'Send notes'), sources, ['/area'])).toBeNull();
    expect(resolveProvenance(task('No field'), sources, ['/area'])).toBeNull();
  });
});

// docs/dev/history/technical-design-perf-threads.md §6 scenarios 2-5, §7: the lookup tables keep today's results.
describe('resolveProvenance on lookup tables (perf-threads)', () => {
  const agreed = (key: string) => task('Follow up', {fields: {...emptyTaskFields(), meeting: key}});

  it('scenario 2: scope first; another Area only when the scope has no such meeting', () => {
    const offsite = m('2026-09-10', 'Strategy offsite #jf/board');
    const sources = [
      {path: '/zen', meetings: [m('2026-09-12', 'Zen planning #jf/board'), offsite]},
      {path: '/team', meetings: [m('2026-09-01', 'Lunch'), {...offsite}]},
    ];
    expect(resolveProvenance(agreed(meetingKey(offsite)), sources, ['/team'])).toMatchObject({path: '/team', meetingIndex: 1, exact: true});
    expect(resolveProvenance(agreed('2026-09-12 Zen planning jf/board'), sources, ['/team'])).toMatchObject({path: '/zen', meetingIndex: 0, exact: true});
  });

  it('scenario 3: the same meeting line twice in one file matches the first', () => {
    const greta = m('2026-09-23', '1:1 Greta #101/greta');
    const sources = [{path: '/area', meetings: [m('2026-09-20', 'Other'), greta, {...greta}]}];
    expect(resolveProvenance(agreed(meetingKey(greta)), sources, ['/area'])).toMatchObject({meetingIndex: 1, exact: true});
  });

  it('scenario 4: a cancelled meeting named exactly still matches; the fallback skips it', () => {
    const carla = m('2026-10-01', '1:1 Carla #101/carla', {cancelled: true});
    const dirk = m('2026-10-02', '1:1 Dirk moved online #101/dirk', {cancelled: true});
    const sources = [{path: '/area', meetings: [carla, dirk]}];
    expect(resolveProvenance(agreed(meetingKey(carla)), sources, ['/area'])).toMatchObject({meetingIndex: 0, exact: true});
    expect(resolveProvenance(agreed('2026-10-02 1:1 Dirk 101/dirk'), sources, ['/area'])).toBeNull();
    const kept = m('2026-10-02', 'Dirk again #101/dirk');
    expect(resolveProvenance(agreed('2026-10-02 1:1 Dirk 101/dirk'), [{path: '/area', meetings: [dirk, kept]}], ['/area'])).toMatchObject({
      meetingIndex: 1,
      exact: false,
    });
  });

  it('scenario 5: a renamed meeting is found by date and thread; moved to another day as well, by nothing', () => {
    const eva = m('2026-09-15', '1:1 Eva - goals #101/eva');
    const sources = [{path: '/area', meetings: [eva]}];
    expect(resolveProvenance(agreed('2026-09-15 1:1 Eva 101/eva'), sources, ['/area'])).toMatchObject({meetingIndex: 0, exact: false});
    const moved = [{path: '/area', meetings: [{...eva, date: '2026-09-16'}]}];
    expect(resolveProvenance(agreed('2026-09-15 1:1 Eva 101/eva'), moved, ['/area'])).toBeNull();
  });

  it('rebuilds a table when its list grew in place (the length guard)', () => {
    const meetings = [m('2026-09-01', 'First #retro/alpha')];
    const sources = [{path: '/area', meetings}];
    const late = m('2026-09-08', 'Late #retro/alpha');
    expect(resolveProvenance(agreed(meetingKey(late)), sources, ['/area'])).toBeNull();
    meetings.push(late);
    expect(resolveProvenance(agreed(meetingKey(late)), sources, ['/area'])).toMatchObject({meetingIndex: 1, exact: true});
  });

  it('sees a changed meeting in a new array (a write-through replaces the list)', () => {
    const before = [m('2026-09-01', 'Retro #retro/alpha')];
    expect(resolveProvenance(agreed('2026-09-01 Sprint retro retro/alpha'), [{path: '/a', meetings: before}], ['/a'])).toMatchObject({exact: false});
    const after = before.map(x => ({...x, ...deriveMeetingFields('Sprint retro #retro/alpha'), title: 'Sprint retro #retro/alpha'}));
    expect(resolveProvenance(agreed('2026-09-01 Sprint retro retro/alpha'), [{path: '/a', meetings: after}], ['/a'])).toMatchObject({exact: true});
  });
});

describe('meetingKey memo (perf-threads §3.1)', () => {
  const unmemoized = (x: Pick<Meeting, 'date' | 'title'>) => normalizeMeetingKey(meetingPageKeyword(x));

  it('gives what the key build gives, for long titles, tags and #prepped/#reviewed', () => {
    const titles = [
      'Jour fixe Board: budget, roadmap, staffing and the open risks #jf/board',
      'Retro Gamma with the whole extended platform team and guests #retro/gamma/2026 #reviewed',
      '1:1 Anna #prepped #101/anna #anna',
      'Plan [draft] #monthly',
      'Plain',
    ];
    for (const title of titles) {
      const x = m('2026-10-26', title);
      expect(meetingKey(x)).toBe(unmemoized(x));
      expect(meetingKey(x)).toBe(unmemoized(x));
    }
  });

  it('builds each distinct key once, and a changed title gets its own key', () => {
    __provenanceStatsForTests.reset();
    const a = m('2026-10-26', 'Retro #retro/alpha');
    meetingKey(a);
    meetingKey({...a});
    expect(__provenanceStatsForTests.keyBuilds()).toBe(1);
    expect(meetingKey({...a, title: 'Retro moved #retro/alpha'})).toBe('2026-10-26 Retro moved retro/alpha');
    expect(__provenanceStatsForTests.keyBuilds()).toBe(2);
  });

  it('is cleared when it reaches its cap', () => {
    __provenanceStatsForTests.reset();
    for (let i = 0; i < 4000; i++) meetingKey({date: '2026-10-26', title: `Meeting ${i}`});
    expect(__provenanceStatsForTests.memoSize()).toBe(4000);
    meetingKey({date: '2026-10-26', title: 'One more'});
    expect(__provenanceStatsForTests.memoSize()).toBe(1);
    expect(meetingKey({date: '2026-10-26', title: 'Meeting 0'})).toBe('2026-10-26 Meeting 0');
  });
});
