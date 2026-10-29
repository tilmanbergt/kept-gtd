import {resetMomentChoices} from '../../src/ui/meetingMomentStore';
import {expectNotShows, expectShows, openApp, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {areaDir, areaFile, dataFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {device} from '../../test-helpers/fakeDevice/device';
import {engageOn, processSportMarks, sectionLine, settings, sport, SPORT, sportClock, sportMark} from '../../test-helpers/scenario/sportArea';

// docs/dev/history/technical-design-engage-page-owner.md §6, on Area Sport (test-helpers/scenario/sportArea.ts).
// Pages below are 1-based as in the design; the fake device counts from 0.
const DESIGN = 'technical-design-engage-page-owner.md';

beforeEach(() => {
  resetMomentChoices();
  sportClock();
});
afterEach(() => jest.useRealTimers());

scenario('Engage on the Home page of a home notebook that is also a loop\'s note: the Area, not the loop', {feature: 'Engage', design: DESIGN}, () => {
  given('Sport 2026.note is Area Sport\'s home notebook and the note of loop marathon; page 1 is its Home page', () => sport());
  when('I open Engage on page 1', () => engageOn(1));
  then('the owner is Area Sport and the line reads "Section: Sport"', () => {
    expectShows('AREA');
    expectShows('Sport');
    expectNotShows('Loop');
    expect(sectionLine()).toEqual(['Section: Sport']);
  });
});

scenario('Engage on a free page after the Home page: the Area, from p. 1', {feature: 'Engage', design: DESIGN}, () => {
  given('page 2 has no title and no keyword', () => sport());
  when('I open Engage on page 2', () => engageOn(2));
  then('the owner is Area Sport and the line reads "Section: Sport · from p. 1"', () => {
    expectShows('AREA');
    expect(sectionLine()).toEqual(['Section: Sport · from p. 1']);
  });
});

scenario('Engage on a loop todo\'s follow-up page: the loop, with that todo current', {feature: 'Engage', design: DESIGN}, () => {
  given('page 5 is the page of the open todo "Plan long runs #loop/marathon", page 6 a follow-up', () => sport());
  when('I open Engage on page 6', () => engageOn(6));
  then('the owner is Loop marathon, the todo is current, and the line names it from p. 5', () => {
    expectShows('LOOP');
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
    expectShows('AREA');
    expectNotShows('Working on');
    expect(sectionLine()).toEqual(['Section: Training plan · from p. 7']);
  });
});

scenario('A handwritten heading starts a section too', {feature: 'Engage', design: DESIGN}, () => {
  given('page 9 has a handwritten title', () => sport());
  when('I open Engage on page 9', () => engageOn(9));
  then('the owner is Area Sport and the line reads "Section: Handwritten section"', () => {
    expectShows('AREA');
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
    expectShows('AREA');
    expectNotShows('Working on');
    expect(sectionLine()).toEqual(['Section: Buy shoes · from p. 10']);
  });
});

scenario('A closed loop\'s todo page goes back to the Area', {feature: 'Engage', design: DESIGN}, () => {
  given('loop marathon is done', () => sport({loop: 'done'}));
  when('I open Engage on page 6', () => engageOn(6));
  then('the owner is Area Sport', () => {
    expectShows('AREA');
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
    expectShows('LOOP');
    expectShows('  · Sport');
    expect(sectionLine()).toEqual(['Section: loop marathon · from p. 1']);
  });
});

scenario('A thread notebook\'s follow-up page: the thread and its sparring', {feature: 'Engage', design: DESIGN}, () => {
  const THREADS = `${areaDir('Coaching')}/Meetings/sparring jordan 2026.note`;
  const kw = '2026-10-24 Sparring Jordan #sparring/jordan';
  given('a thread notebook with a sparring page for Jordan and a follow-up page', () => {
    sport();
    putFile(
      areaFile('Coaching'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: [`- 2026-10-24 10:00-11:00 Sparring Jordan #sparring/jordan → [[Meetings/sparring jordan 2026.note#${kw}]]`], Threads: ['- jordan: active']}, ['abbrev: Co']),
    );
    device().sdk.putNote(THREADS, [{keywords: ['2026-10-24', kw]}, {}]);
  });
  when('I open Engage on the follow-up page', () => engageOn(2, THREADS));
  then('the owner is Thread #sparring/jordan and the moment line shows that sparring', () => {
    expectShows('THREAD');
    expectShows('  · Coaching');
    expectShows('Sparring Jordan · Sat 24.10. 10:00–11:00');
    expect(sectionLine()).toEqual(['Section: Sparring Jordan sparring/jordan · 24.10. · from p. 1']);
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

// Capture (§6.2 16-19). The fake device has no lasso; marks go through the same capture panel and provenance.

scenario('An agreement from a mark on a thread notebook\'s follow-up page: for the thread, with the sparring', {feature: 'Lasso', design: DESIGN}, () => {
  const kw = '2026-10-24 Sparring Jordan #sparring/jordan';
  given('Jordan\'s sparring notebook has the sparring\'s page and a follow-up page with a mark "Feedback only in our 1:1s"', () => {
    putFile(
      areaFile('Coaching'),
      dataFile(
        'area',
        {
          Scope: [],
          Tasks: [],
          Meetings: [`- 2026-10-24 10:00-11:00 Sparring Jordan #sparring/jordan → [[Meetings/sparring jordan 2026.note#${kw}]]`],
          Threads: ['- jordan: active'],
          Marks: ['- 2026-10-25 09:00 [[Meetings/sparring jordan 2026.note]] p2 Feedback only in our 1:1s ^m-20261025-090000-000'],
        },
        ['abbrev: Co'],
      ),
    );
    device().sdk.putNote(`${areaDir('Coaching')}/Meetings/sparring jordan 2026.note`, [{keywords: ['2026-10-24', kw]}, {}]);
  });
  when('I process the mark as an Agreement', async () => {
    await openApp({settings: settings()});
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap(/to process/);
    await tap('Agreement');
  });
  then('the For chips start with #sparring/jordan, and the grey line names the sparring', () => {
    const all = texts();
    expect(all.indexOf('#sparring/jordan')).toBeGreaterThan(all.indexOf('For'));
    expect(all.indexOf('#sparring/jordan')).toBeLessThan(all.indexOf('#CO Coaching'));
    expectShows(/^↳ from Sparring Jordan/);
  });
  when('I tap Save & close', () => tap(/^Save & close/));
  then('the agreement records the sparring meeting', () => {
    expect(sectionLines(areaFile('Coaching'), 'Agreements')).toEqual([
      '- Feedback only in our 1:1s #sparring/jordan [meeting:: 2026-10-24 Sparring Jordan sparring/jordan] [created:: 2026-10-25]',
    ]);
  });
});

scenario('Your own heading stops the provenance', {feature: 'Lasso', design: DESIGN}, () => {
  given('page 8 follows the heading "Training plan" and has a mark "Book track time"', () => sport({marks: [sportMark(8, 'Book track time')]}));
  when('I process the mark', processSportMarks);
  then('no "↳ from" line shows', () => expectNotShows(/^↳ from/));
  when('I save it as a todo', () => tap(/^Save & close/));
  then('no meeting is recorded', () => {
    const line = sectionLines(areaFile('Sport'), 'Tasks').find(l => l.includes('Book track time'));
    expect(line).toBeDefined();
    expect(line).not.toContain('[meeting::');
  });
});

scenario('A cancelled meeting\'s follow-up page records no meeting', {feature: 'Lasso', design: DESIGN}, () => {
  given('the meeting "Coach call" of page 3 is cancelled; page 4 has a mark "Ask coach about intervals"', () => sport({coach: 'cancelled', marks: [sportMark(4, 'Ask coach about intervals')]}));
  when('I process the mark', processSportMarks);
  then('no "↳ from" line shows', () => expectNotShows(/^↳ from/));
  when('I save it as a todo', () => tap(/^Save & close/));
  then('no meeting is recorded', () => {
    const line = sectionLines(areaFile('Sport'), 'Tasks').find(l => l.includes('Ask coach about intervals'));
    expect(line).toBeDefined();
    expect(line).not.toContain('[meeting::');
  });
});
