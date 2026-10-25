import {meetingKey} from '../../src/domain/provenance';
import {NoteSetup, seedNoteSetupDefaults} from '../../src/domain/noteSetups';
import {GtdParaSettings} from '../../src/domain/settings';
import {resetMomentChoices} from '../../src/ui/meetingMomentStore';
import {expectNotShows, expectShows, labelled, openEngage, tap, texts} from '../../test-helpers/scenario/app';
import {areaDir, areaFile, dataFile, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';
import {device} from '../../test-helpers/fakeDevice/device';

// docs/dev/history/technical-design-engage-page-owner.md §6: Area Sport's home notebook "Sport 2026.note" is also
// the note of its active loop #loop/marathon (Loop setup named "{name} {year}", main date in 2026). Pages below are
// 1-based as in the design; the fake device counts from 0.
const DESIGN = 'technical-design-engage-page-owner.md';
const SPORT = areaDir('Sport');
const NOTEBOOK = `${SPORT}/Sport 2026.note`;
const COACH_DATE = '2026-10-24';
const COACH_KEY = meetingKey({date: COACH_DATE, title: 'Coach call'});

/** Only the clock is faked: timers stay real, so the app's settling works as everywhere else. */
function clock(): void {
  jest.useFakeTimers({
    now: new Date(2026, 9, 25, 9, 0),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
  });
}

beforeEach(() => {
  resetMomentChoices();
  clock();
});
afterEach(() => jest.useRealTimers());

/** The Loop setup "Marathon" on `#loop`; its notes are named `name`. */
function loopSetup(name: string): NoteSetup {
  return {id: 'l1', name: 'Marathon', kind: 'loop', tags: ['loop'], enabled: true, notebook: {name, folder: ''}, pages: {}, tracking: {trackPrep: false, trackReview: false}};
}

/** Sparring threads, the Marathon loop setup and the seeded Default ("{name} {year}" home notebooks). */
function settings(loopNoteName = '{name} {year}'): Partial<GtdParaSettings> {
  const sparring = sparringSettings().noteSetups ?? [];
  return {noteSetups: [...sparring, loopSetup(loopNoteName)], noteSetupDefaults: seedNoteSetupDefaults(), nextNoteSetupId: 3, noteSetupsMigrated: true};
}

/** A heading on a page: `typed` puts a textbox under it, otherwise it is handwritten. */
function headingPage(page: number, typed: string | null): object {
  const rect = {left: 100, top: 120, right: 900, bottom: 180};
  const title = {page, X: 100, Y: 120, width: 800, height: 60, style: 3, controlTrailNums: typed ? [1] : []};
  const textbox = {uuid: 'tb', type: 500, pageNum: page, layerNum: 0, numInPage: 1, textBox: {textContentFull: typed, textRect: rect}, link: null};
  return {titles: [title], elements: typed ? [textbox] : []};
}

/**
 * Area Sport and its notebook: p1 Home, p2 free, p3 meeting "Coach call", p4 free, p5 todo "Plan long runs
 * #loop/marathon", p6 free, p7 typed heading "Training plan", p8 free, p9 handwritten heading, p10 todo "Buy shoes"
 * (keyword, no title), p11 free.
 */
function sport(options: {loop?: 'active' | 'done'; shoes?: 'open' | 'cancelled'; coach?: 'held' | 'cancelled'} = {}): void {
  const shoes = options.shoes === 'cancelled' ? '- [-] Buy shoes' : '- [ ] Buy shoes';
  const coach = `- ${COACH_DATE} 10:00-11:00 Coach call${options.coach === 'cancelled' ? ' #cancelled' : ''} → [[Sport 2026.note#${COACH_DATE} Coach call]]`;
  putFile(
    areaFile('Sport'),
    dataFile(
      'area',
      {
        Scope: [],
        Tasks: [
          '- [ ] Plan long runs #loop/marathon → [[Sport 2026.note#Plan long runs #loop/marathon]]',
          `${shoes} → [[Sport 2026.note#Buy shoes]]`,
          `- [ ] Book physio [meeting:: ${COACH_KEY}]`,
        ],
        Meetings: [coach],
        Loops: [`- loop/marathon: ${options.loop ?? 'active'}, 2026-11-15`],
      },
      ['abbrev: Sp'],
    ),
  );
  const t = (p: object) => p as never;
  device().sdk.putNote(NOTEBOOK, [
    {keywords: ['home']},
    {},
    {keywords: [COACH_DATE, `${COACH_DATE} Coach call`]},
    {},
    {keywords: ['Plan long runs #loop/marathon']},
    {},
    t(headingPage(6, 'Training plan\nweek 1-4')),
    {},
    t(headingPage(8, null)),
    {keywords: ['Buy shoes']},
    {},
  ]);
}

/** Engage on page `page` (1-based) of `note`. */
const engageOn = (page: number, note = NOTEBOOK, loopNoteName?: string) => openEngage({fromNote: note, page: page - 1, settings: settings(loopNoteName)});

const sectionLine = () => texts().filter(l => l.startsWith('Section: '));

scenario('Engage on the Home page of a home notebook that is also a loop\'s note: the Area, not the loop', {feature: 'Engage', design: DESIGN}, () => {
  given('Sport 2026.note is Area Sport\'s home notebook and the note of loop marathon; page 1 is its Home page', () => sport());
  when('I open Engage on page 1', () => engageOn(1));
  then('the owner is Area Sport and the line reads "Section: Sport"', () => {
    expectShows('Area');
    expectShows('Sport');
    expectNotShows('Loop');
    expect(sectionLine()).toEqual(['Section: Sport']);
  });
});

scenario('Engage on a free page after the Home page: the Area, from p. 1', {feature: 'Engage', design: DESIGN}, () => {
  given('page 2 has no title and no keyword', () => sport());
  when('I open Engage on page 2', () => engageOn(2));
  then('the owner is Area Sport and the line reads "Section: Sport · from p. 1"', () => {
    expectShows('Area');
    expect(sectionLine()).toEqual(['Section: Sport · from p. 1']);
  });
});

scenario('Engage on a meeting\'s follow-up page: the meeting is passed on', {feature: 'Engage', design: DESIGN}, () => {
  given('page 3 is the page of meeting "Coach call" (Sport, no loop tag), where "Book physio" was agreed; page 4 is handwritten without a title', () => sport());
  when('I open Engage on page 4', () => engageOn(4));
  then('the owner is Area Sport, the moment line shows Coach call with its moment, From offers its group', () => {
    expectShows('Area');
    expectShows('Coach call · Sat 24.10. 10:00–11:00');
    expect(labelled('After')?.on).toBe(true);
    expectShows('From meetings 1');
    expectShows('Sat 24.10. · Coach call');
  });
  and('the line reads "Section: Coach call · 24.10. · from p. 3"', () => expect(sectionLine()).toEqual(['Section: Coach call · 24.10. · from p. 3']));
});

scenario('Engage on a loop todo\'s follow-up page: the loop, with that todo current', {feature: 'Engage', design: DESIGN}, () => {
  given('page 5 is the page of the open todo "Plan long runs #loop/marathon", page 6 a follow-up', () => sport());
  when('I open Engage on page 6', () => engageOn(6));
  then('the owner is Loop marathon, the todo is current, and the line names it from p. 5', () => {
    expectShows('Loop');
    expectShows('  · Sport');
    expectShows('Working on');
    expectShows(/^Plan long runs/);
    expect(sectionLine()).toEqual(['Section: Plan long runs loop/marathon · from p. 5']);
  });
});

scenario('Your own heading starts a section of the notebook owner', {feature: 'Engage', design: DESIGN}, () => {
  given('page 7 has my typed heading "Training plan"', () => sport());
  when('I open Engage on page 8', () => engageOn(8));
  then('the owner is Area Sport and the line reads "Section: Training plan · from p. 7"', () => {
    expectShows('Area');
    expectNotShows('Working on');
    expect(sectionLine()).toEqual(['Section: Training plan · from p. 7']);
  });
});

scenario('A handwritten heading starts a section too', {feature: 'Engage', design: DESIGN}, () => {
  given('page 9 has a handwritten title', () => sport());
  when('I open Engage on page 9', () => engageOn(9));
  then('the owner is Area Sport and the line reads "Section: Handwritten section"', () => {
    expectShows('Area');
    expect(sectionLine()).toEqual(['Section: Handwritten section']);
  });
});

scenario('A todo\'s keyword without a title still starts its section', {feature: 'Engage', design: DESIGN}, () => {
  given('page 10 carries the keyword of todo "Buy shoes" but no title; page 11 is a follow-up', () => sport());
  when('I open Engage on page 11', () => engageOn(11));
  then('"Buy shoes" is current and the section is p. 10', () => {
    expectShows('Working on');
    expectShows(/^Buy shoes/);
    expect(sectionLine()).toEqual(['Section: Buy shoes · from p. 10']);
  });
});

scenario('A cancelled todo\'s page still starts a section, but nothing becomes current', {feature: 'Engage', design: DESIGN}, () => {
  given('the todo "Buy shoes" of page 10 is cancelled', () => sport({shoes: 'cancelled'}));
  when('I open Engage on page 11', () => engageOn(11));
  then('the owner is Area Sport, no todo is current, and the line still reads "Section: Buy shoes · from p. 10"', () => {
    expectShows('Area');
    expectNotShows('Working on');
    expect(sectionLine()).toEqual(['Section: Buy shoes · from p. 10']);
  });
});

scenario('A closed loop\'s todo page goes back to the Area', {feature: 'Engage', design: DESIGN}, () => {
  given('loop marathon is done', () => sport({loop: 'done'}));
  when('I open Engage on page 6', () => engageOn(6));
  then('the owner is Area Sport', () => {
    expectShows('Area');
    expectNotShows('Loop');
    expect(sectionLine()).toEqual(['Section: Plan long runs loop/marathon · from p. 5']);
  });
});

scenario('A pure loop note: a free page after the loop page belongs to the loop', {feature: 'Engage', design: DESIGN}, () => {
  const LOOP_NOTE = `${SPORT}/2026-11 loop marathon.note`;
  given('loop marathon\'s note "2026-11 loop marathon.note" is not a home notebook; page 2 is free', () => {
    sport();
    device().sdk.putNote(LOOP_NOTE, [{keywords: ['loop loop/marathon']}, {}]);
  });
  when('I open Engage on page 2 of the loop note', () => engageOn(2, LOOP_NOTE, ''));
  then('the owner is the loop and the line names the loop page', () => {
    expectShows('Loop');
    expectShows('  · Sport');
    expect(sectionLine()).toEqual(['Section: loop marathon · from p. 1']);
  });
});

scenario('A thread notebook\'s follow-up page: the thread and its sparring', {feature: 'Engage', design: DESIGN}, () => {
  const THREADS = `${areaDir('Coaching')}/Meetings/sparring mieke 2026.note`;
  const kw = '2026-10-24 Sparring Mieke #sparring/mieke';
  given('a thread notebook with a sparring page for Mieke and a follow-up page', () => {
    sport();
    putFile(
      areaFile('Coaching'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: [`- 2026-10-24 10:00-11:00 Sparring Mieke #sparring/mieke → [[Meetings/sparring mieke 2026.note#${kw}]]`], Threads: ['- mieke: active']}, ['abbrev: Co']),
    );
    device().sdk.putNote(THREADS, [{keywords: ['2026-10-24', kw]}, {}]);
  });
  when('I open Engage on the follow-up page', () => engageOn(2, THREADS));
  then('the owner is Thread #sparring/mieke and the moment line shows that sparring', () => {
    expectShows('Thread');
    expectShows('  · Coaching');
    expectShows('Sparring Mieke · Sat 24.10. 10:00–11:00');
    expect(sectionLine()).toEqual(['Section: Sparring Mieke sparring/mieke · 24.10. · from p. 1']);
  });
});

scenario('A todo\'s own note: as before, no section line', {feature: 'Engage', design: DESIGN}, () => {
  given('the todo "Stretch daily" has its own note', () => {
    sport();
    const file = areaFile('Sport');
    putFile(file, device().fs.get(file)!.replace('- [ ] Book physio', '- [ ] Stretch daily → [[Todos/Stretch daily.note]]\n- [ ] Book physio'));
    device().sdk.putNote(`${SPORT}/Todos/Stretch daily.note`, [{}, {}]);
  });
  when('I open Engage on its page 2', () => engageOn(2, `${SPORT}/Todos/Stretch daily.note`));
  then('the todo is current and no section line shows', () => {
    expectShows('Working on');
    expectShows(/^Stretch daily/);
    expect(sectionLine()).toEqual([]);
  });
});

scenario('The page index can\'t be read: the single-page lookup, and the panel opens', {feature: 'Engage', design: DESIGN}, () => {
  given('the notebook\'s headings can\'t be read', () => {
    sport();
    Object.assign(device().sdk.module.PluginFileAPI, {getTitles: async () => ({success: false, error: {code: 1, message: 'not readable'}})});
  });
  when('I open Engage on the meeting page 3', () => engageOn(3));
  then('it falls back to the page\'s own keyword: the meeting\'s moment line, no section line, "index not read" logged', () => {
    expectShows('Coach call · Sat 24.10. 10:00–11:00');
    expect(sectionLine()).toEqual([]);
    expect(device().logs.some(l => l.text.startsWith('pageSection: index not read'))).toBe(true);
  });
  when('I tap Close', () => tap('Close'));
  then('the panel closed without an error', () => expect(device().sdk.closed).toBeGreaterThan(0));
});
