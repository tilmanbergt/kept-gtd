import {expectNotShows, expectShows, openApp, readTexts, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {createNoteSetup} from '../../src/domain/noteSetups';

// Focus blocks (docs/dev/history/technical-design-time-and-place.md §3.1, §6 scenarios 1 and 2).
const DESIGN = 'technical-design-time-and-place.md';

afterEach(() => jest.useRealTimers());

const writingLoops = {...createNoteSetup('1', 'loop'), name: 'Writing', tags: ['writing']};
const sparring = {...createNoteSetup('2', 'thread'), name: 'Sparring', tags: ['sparring'], tracking: {trackPrep: true, trackReview: true}};

scenario('Focus block from Quick Add: F on, the tag in the file, an F row and a Focus card', {feature: 'Meetings', design: DESIGN}, () => {
  given('the smoke space on Wednesday and a Loop setup for #writing', () => {
    smokeClock();
    putSmokeSpace();
  });
  when('I add the meeting "Writing session #writing/novel" tomorrow 9-11 on Daily with F on', async () => {
    await openApp({settings: {noteSetups: [writingLoops], noteSetupsMigrated: true}});
    await tapTab('Daily');
    await tap('Meeting');
    await type('New meeting title', 'Writing session #writing/novel');
    await type('YYYY-MM-DD', '2026-10-15');
    await type('15 · 15-16.30 · 2d', '9-11');
    await tap('F');
    await tap('+ Add');
  });
  then('Inbox.txt has the line with #focusblock', () => {
    expect(sectionLines(INBOX_FILE, 'Meetings')).toContainEqual('- 2026-10-15 09:00-11:00 Writing session #writing/novel #focusblock');
  });
  when('I open Tomorrow', () => tap('Tomorrow'));
  then('the row shows the F mark and no #focusblock; the day counts it as focus', () => {
    expect(textsBetween(/^Thu 15\.10\./, 'Focus')).toContain('F');
    expectShows(/^Writing session/);
    expectNotShows(/#focusblock/);
    expectShows(/^Thu 15\.10\. · 1 meeting · 1 focus$/);
  });
  when('I tap it', () => tap('Writing session #writing/novel'));
  then('the card says "Focus · ahead" with "writing novel ›" and has no P or R', () => {
    expectShows('Focus · ahead');
    expectShows('writing novel ›');
    expect(readTexts()).not.toContain('P');
    expect(readTexts()).not.toContain('R');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('No close-out for focus blocks', {feature: 'Meetings', design: DESIGN}, () => {
  given('area Coaching with yesterday\'s "Sparring Mieke" and the focus block "Sparring prep", both of a setup that tracks review', () => {
    smokeClock();
    putFile(
      areaFile('Coaching'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-10-13 10:00-11:00 Sparring Mieke #sparring/mieke', '- 2026-10-13 14:00-15:00 Sparring prep #sparring/mieke #focusblock']}),
    );
  });
  when('I open Review → Meetings to close out', async () => {
    await openApp({settings: {noteSetups: [sparring], noteSetupsMigrated: true}});
    await tapTab('Review');
    await tap(/^Meetings to close out/);
  });
  then('it lists the meeting and not the focus block', () => {
    expectShows(/^Sparring Mieke/);
    expectNotShows(/^Sparring prep/);
  });
  and('nothing was logged as an error', () => expect(loggedErrors()).toEqual([]));
});
