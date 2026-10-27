import {expectShows, openApp, readTexts, shows, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';
import {smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {createNoteSetup} from '../../src/domain/noteSetups';

// Given time and Tend (docs/dev/history/technical-design-time-and-place.md §3.4, §6 scenarios 13 and 14; §3.6 "+ F block").
const DESIGN = 'technical-design-time-and-place.md';

afterEach(() => jest.useRealTimers());

const writingLoops = {...createNoteSetup('1', 'loop'), name: 'Writing', tags: ['writing']};

scenario('Given time: owners by time, an all-day event as "1 day", Worked on for todos done', {feature: 'Week and Month', design: DESIGN}, () => {
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
    expect(textsBetween('Given time this week', 'Worked on this week')).toEqual(['Garden  Area', '1 day', '1 meeting', 'Writing  Area', '3.5 h', '2 blocks · next: Draft chapter']);
  });
  and('Worked on lists Website with its todo done', () => {
    expect(textsBetween('Worked on this week').slice(0, 2)).toEqual(['Website  Project', '1 done']);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Tend: a thread without a meeting in 14 days counts in the Tend line and shows "nothing planned"', {feature: 'Review', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Coaching\'s active thread mieke met yesterday and has nothing ahead', () => {
    smokeClock();
    putFile(
      areaFile('Coaching'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-10-13 10:00-11:00 Sparring Mieke #sparring/mieke'], Threads: ['- mieke: active']}, ['abbrev: Co']),
    );
  });
  when('I open Week', async () => {
    await openApp({settings: sparringSettings()});
    await tapTab('Week');
  });
  then('the Tend line counts one quiet thread', () => expectShows('Tend: 1 thread quiet ›'));
  when('I tap it', () => tap('Tend: 1 thread quiet ›'));
  then('Review opens Tending threads, where mieke\'s row says "nothing planned"', () => {
    expectShows('Tending threads');
    expect(readTexts().some(t => /nothing planned/.test(t))).toBe(true);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Open loops: "+ F block" fills Quick Add\'s Meeting tab with the loop and F on', {feature: 'Review', design: DESIGN}, () => {
  given('on Wednesday 14.10.: Writing with the active loop #writing/novel and nothing planned', () => {
    smokeClock();
    putFile(areaFile('Writing'), dataFile('area', {Scope: [], Tasks: ['- [ ] Outline #writing/novel #next'], Meetings: [], Loops: ['- writing/novel: active']}));
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
