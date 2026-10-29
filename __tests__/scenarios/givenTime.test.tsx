import {expectShows, openApp, readTexts, shows, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, loggedErrors, PATHS, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {createNoteSetup} from '../../src/domain/noteSetups';

// Given time and Tend (docs/dev/history/technical-design-time-and-place.md §3.4, §6 scenarios 13 and 14; §3.6 "+ F block").
const DESIGN = 'technical-design-time-and-place.md';

afterEach(() => jest.useRealTimers());

const writingLoops = {...createNoteSetup('1', 'loop'), name: 'Writing', tags: ['writing']};

scenario('Given time: areas and projects by time, an all-day event as "1 day", Worked on for todos done', {feature: 'Week and Month', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Writing with two focus blocks this week, Garden with an all-day delivery, Website with a todo done and nothing scheduled', () => {
    smokeClock();
    putFile(
      areaFile('Writing'),
      dataFile('area', {Scope: [], Tasks: ['- [ ] Draft chapter #next'], Meetings: ['- 2026-10-12 09:00-11:00 Chapter one #focusblock', '- 2026-10-15 09:00-10:30 Chapter two #focusblock']}),
    );
    putFile(areaFile('Garden'), dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-10-16 1d Delivery', '- 2026-10-21 10:00 Next week']}));
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: ['- [x] Publish page [completion:: 2026-10-13]'], Meetings: []}));
  });
  when('I open Week', async () => {
    await openApp();
    await tapTab('Week');
  });
  then('Given time lists Garden (1 day) above Writing (3.5 h, two blocks, its next todo)', () => {
    expect(textsBetween('Given time this week', 'Loops and counterparts')).toEqual(['Garden', 'AREA', '1 day', '1 meeting', 'Writing', 'AREA', '3.5 h', '2 blocks · next: Draft chapter']);
  });
  and('no loop or counterpart reaches 1 h', () => {
    expect(textsBetween('Loops and counterparts', 'Worked on this week')).toEqual(['Nothing above 1 h this week']);
  });
  and('Worked on lists Website with its todo done', () => {
    expect(textsBetween('Worked on this week').slice(0, 3)).toEqual(['Website', 'PROJECT', '1 done']);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Tend: a thread without a meeting in 14 days counts in the Tend line and shows "nothing planned"', {feature: 'Review', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Coaching\'s active thread jordan met yesterday and has nothing ahead', () => {
    smokeClock();
    putFile(
      areaFile('Coaching'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-10-13 10:00-11:00 Sparring Jordan #sparring/jordan'], Threads: ['- jordan: active']}, ['abbrev: Co']),
    );
  });
  when('I open Week', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Week');
  });
  then('the Tend line counts one quiet thread', () => expectShows('Tend: 1 counterpart quiet ›'));
  when('I tap it', () => tap('Tend: 1 counterpart quiet ›'));
  then('Review opens Tending threads, where jordan\'s row says "nothing planned"', () => {
    expectShows('Tending threads');
    expect(readTexts().some(t => /nothing planned/.test(t))).toBe(true);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Open loops: "+ F block" fills Quick Add\'s Meeting tab with the loop and F on', {feature: 'Review', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Writing with the active loop #writing/novel, nothing planned and no next todo', () => {
    smokeClock();
    putFile(areaFile('Writing'), dataFile('area', {Scope: [], Tasks: ['- [ ] Outline #writing/novel'], Meetings: [], Loops: ['- writing/novel: active']}));
  });
  when('I open Review → Open loops and select the loop', async () => {
    await openApp({settings: {noteSetups: [writingLoops], noteSetupsMigrated: true}});
    await tapTab('Review');
    if (shows('Overview')) await tap('Overview');
    await tap(/^Open loops/);
    await tap(/novel/);
  });
  then('its row says "nothing planned"', () => expect(readTexts().some(t => /nothing planned/.test(t))).toBe(true));
  when('I tap "+ F block", set 9-11 and add', async () => {
    await tap('+ F block');
    await type('15 · 15-16.30 · 2d', '9-11');
    await tap('+ Add');
  });
  then('Writing gets a focus block today with the loop tag', () => {
    expect(sectionLines(areaFile('Writing'), 'Meetings')).toEqual(['- 2026-10-14 09:00-11:00 novel #writing/novel #focusblock']);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Given time lists loops and counterparts from the threshold up, never the Inbox', {feature: 'Week and Month', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Writing with 2 h for the loop novel and 30 min for the loop essay this week, and an Inbox meeting', () => {
    smokeClock();
    putFile(
      areaFile('Writing'),
      dataFile('area', {
        Scope: [],
        Tasks: [],
        Meetings: ['- 2026-10-12 09:00-11:00 Chapter one #writing/novel #focusblock', '- 2026-10-13 09:00-09:30 Sketch #writing/essay #focusblock'],
        Loops: ['- writing/novel: active', '- writing/essay: active'],
      }),
    );
    putFile(PATHS.inbox, dataFile('inbox', {Tasks: [], Meetings: ['- 2026-10-14 16:00-17:00 Dentist']}));
  });
  when('I open Week', async () => {
    await openApp({settings: {noteSetups: [writingLoops], noteSetupsMigrated: true}});
    await tapTab('Week');
  });
  then('Writing has all 2.5 h; Loops and counterparts lists novel, not essay (below 1 h); no Inbox row', () => {
    expect(textsBetween('Given time this week', 'Loops and counterparts')).toEqual(['Writing', 'AREA', '2.5 h', '2 blocks']);
    expect(textsBetween('Loops and counterparts').slice(0, 3)).toEqual(['novel', 'LOOP', '2 h']);
    expect(readTexts()).not.toContain('INBOX');
    expect(readTexts()).not.toContain('essay');
  });
  when('I set Everything\'s threshold to "all" a week in Settings → Contexts and go back to Week', async () => {
    await tap('Everything ›');
    await tap(/built in: all your projects/);
    await tap('all');
    await tapTab('Week');
  });
  then('essay shows too', () => {
    expect(textsBetween('Loops and counterparts')).toEqual(expect.arrayContaining(['novel', 'LOOP', 'essay', 'LOOP', '30 min']));
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Given time sums a counterpart\'s threads into one row', {feature: 'Week and Month', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Atruvia with Retro, Review and Replenishment with "value" this week, 1 h each', () => {
    smokeClock();
    putFile(
      areaFile('Atruvia'),
      dataFile('area', {
        Scope: [],
        Tasks: [],
        Meetings: [
          '- 2026-10-12 09:00-10:00 Retro #retro/value',
          '- 2026-10-13 09:00-10:00 Review #review/value',
          '- 2026-10-14 09:00-10:00 Replenishment #replenishment/value',
        ],
      }),
    );
  });
  when('I open Week', async () => {
    const setup = (id: string, tag: string) => ({...createNoteSetup(id, 'thread'), name: tag, tags: [tag]});
    await openApp({settings: {noteSetups: [setup('1', 'retro'), setup('2', 'review'), setup('3', 'replenishment')], noteSetupsMigrated: true}});
    await tapTab('Week');
  });
  then('Loops and counterparts lists "value" once, with 3 h and its three series', () => {
    expect(textsBetween('Loops and counterparts').slice(0, 4)).toEqual(['value', 'COUNTERPART', '3 h', 'retro · review · replenishment · 3 meetings']);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});
