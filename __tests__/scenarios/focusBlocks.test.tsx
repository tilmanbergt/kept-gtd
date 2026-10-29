import {expectNotShows, expectShows, openApp, openEngage, readTexts, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, loggedErrors, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../test-helpers/scenario/smokeSpace';
import {createNoteSetup} from '../../src/domain/noteSetups';
import {device} from '../../test-helpers/fakeDevice/device';

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
  then('the row shows the F mark and no #focusblock; the day counts it as focus, with the smoke space\'s own block', () => {
    expect(textsBetween(/^Thu 15\.10\./, 'Focus')).toContain('F');
    expectShows(/^Writing session/);
    expectNotShows(/#focusblock/);
    expectShows(/^Thu 15\.10\. · 1 meeting · 2 focus$/);
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

scenario('Engage fallback: on a note without owner, Engage lists the owners of today\'s remaining schedule', {feature: 'Engage', design: DESIGN}, () => {
  given('on Wednesday 14.10. at 10:00: Garden\'s "Neighbour chat" at 14:00 and a Writing focus block at 11:00, an earlier block at 8:00', () => {
    smokeClock();
    putSmokeSpace();
    putFile(
      areaFile('Writing'),
      dataFile('area', {Scope: [], Tasks: ['- [ ] Outline'], Meetings: ['- 2026-10-14 11:00-12:00 Chapter #focusblock', '- 2026-10-14 08:00-09:00 Early #focusblock']}),
    );
    device().sdk.putNote('/storage/emulated/0/Note/Elsewhere.note');
  });
  when('I press Engage on a note outside every Project and Area', () => openEngage({fromNote: '/storage/emulated/0/Note/Elsewhere.note'}));
  then('it shows today\'s schedule: Writing (the block at 11:00), then Garden (14:00); the Inbox\'s Dentist has no owner', () => {
    const lines = readTexts().filter(t => t.endsWith('›') && /^(Area|Project|Loop|Thread) · /.test(t));
    expect(readTexts()).toContain("Today's schedule");
    expect(lines).toEqual(['Area · Writing · pick next ›', 'Area · Garden · 1 next ›']);
  });
  and('nothing was logged as an error', () => expect(loggedErrors()).toEqual([]));
});

scenario('Month: a focus block shows with its name and F only when marked M', {feature: 'Week and Month', design: DESIGN}, () => {
  given('area Writing with the focus block "Chapter one" on 15.10. marked M and "Chapter two" on 16.10. without M', () => {
    smokeClock();
    putFile(
      areaFile('Writing'),
      dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-10-15 09:00-11:00 Chapter one #focusblock #monthly', '- 2026-10-16 09:00-11:00 Chapter two #focusblock']}),
    );
  });
  when('I open Month', async () => {
    await openApp();
    await tapTab('Month');
  });
  then('the 15th shows "Chapter one" and F; the 16th shows nothing', () => {
    expect(textsBetween(/^Th 15/, /^Fr 16/)).toEqual(expect.arrayContaining(['Chapter one', 'F']));
    expect(textsBetween(/^Fr 16/, /^Sa 17/).filter(t => t !== '')).toEqual([]);
    expect(loggedErrors()).toEqual([]);
  });
});
