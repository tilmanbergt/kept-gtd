// docs/dev/history/technical-design-writing-help.md §6, scenarios 11-18: dates, times and meeting hints in Quick Add.
import {expectNotShows, expectShows, fieldValue, focus, openApp, tap, tapTab, textsBetween, type} from '../../test-helpers/scenario/app';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {dataFile, projectFile, putFile} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const DATE = 'YYYY-MM-DD';
const TIME = '15 · 15-16.30 · 2d';
const TITLE = 'New meeting title';

// Monday 9 November 2026, 10:00.
const clock = () => fixedClock(new Date(2026, 10, 9, 10, 0));
afterEach(() => jest.useRealTimers());

/** Project "Website" with `meetings`, opened on its page with the Meeting tab chosen. */
async function openMeetingTab(meetings: string[] = []): Promise<void> {
  clock();
  putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: meetings}));
  await openApp();
  await tapTab('Projects');
  await tap(/^Website/);
  await tap('Meeting');
}

const dates = 'quick-add.md#dates-and-times';
const hints = 'quick-add.md#warnings-and-the-usual-time';

scenario('A handwritten date is read, shown in full, with Undo', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: dates}, () => {
  when('recognition writes "9.ll.26" into the meeting date', async () => {
    await openMeetingTab();
    await focus(DATE);
    await type(DATE, '9.ll.26');
  });
  then('the field holds 2026-11-09 and the strip says "read as Mon 9 Nov 2026" with Undo', () => {
    expect(fieldValue(DATE)).toBe('2026-11-09');
    expectShows('read as Mon 9 Nov 2026');
    expectShows('Undo');
  });
  when('I tap Undo', async () => {
    await tap('Undo');
  });
  then('the written text is back', () => {
    expect(fieldValue(DATE)).toBe('9.ll.26');
  });
});

scenario('The date strip leads with the full date', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: dates}, () => {
  when('the meeting date is 2026-11-10 and the cursor is in it', async () => {
    await openMeetingTab();
    await focus(DATE);
    await type(DATE, '2026-11-10');
  });
  then('the strip shows "Tue 10 Nov 2026" before -1, Today, +1 and +7', () => {
    expect(textsBetween('Tue 10 Nov 2026').slice(0, 4)).toEqual(['-1', 'Today', '+1', '+7']);
  });
  when('I tap +1', async () => {
    await tap('+1');
  });
  then('it reads "Wed 11 Nov 2026"', () => {
    expect(fieldValue(DATE)).toBe('2026-11-11');
    expectShows('Wed 11 Nov 2026');
  });
});

scenario('A handwritten time is read with its length', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: dates}, () => {
  when('recognition writes "l5,3O-l6" into the time field', async () => {
    await openMeetingTab();
    await focus(TIME);
    await type(TIME, 'l5,3O-l6');
  });
  then('the field holds 15:30-16:00 and the strip says "read as 15:30 – 16:00 · 30 min"', () => {
    expect(fieldValue(TIME)).toBe('15:30-16:00');
    expectShows('read as 15:30 – 16:00 · 30 min');
  });
});

scenario('An hour from 1 to 6 offers the afternoon first', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: dates}, () => {
  when('recognition writes "3-4" into the time field', async () => {
    await openMeetingTab();
    await focus(TIME);
    await type(TIME, '3-4');
  });
  then('the strip offers 15:00 – 16:00 first, then 3:00 – 4:00', () => {
    expect(textsBetween('Did you mean').slice(0, 2)).toEqual(['15:00 – 16:00', '3:00 – 4:00']);
  });
  when('I tap 15:00 – 16:00', async () => {
    await tap('15:00 – 16:00');
  });
  then('the field holds it', () => {
    expect(fieldValue(TIME)).toBe('15:00-16:00');
  });
  when('recognition writes "8" instead', async () => {
    await type(TIME, '');
    await type(TIME, '8');
  });
  then('it is 8:00 without a choice - already past at 10:00 today', () => {
    expectNotShows('Did you mean');
    expectShows('8:00 · past');
  });
});

scenario('A one-digit minute offers both readings and keeps what is written', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: dates}, () => {
  when('recognition writes "15,3" into the time field', async () => {
    await openMeetingTab();
    await focus(TIME);
    await type(TIME, '15,3');
  });
  then('the strip offers 15:30 and 15:03 and the field keeps "15,3"', () => {
    expect(textsBetween('Did you mean').slice(0, 2)).toEqual(['15:30', '15:03']);
    expect(fieldValue(TIME)).toBe('15,3');
  });
});

scenario('An overlap with another meeting that day is named', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: hints}, () => {
  given('the meeting "Jour Fixe" today 15:00-16:00', () => undefined);
  when('I enter 15:30-16:30 for a new meeting today', async () => {
    await openMeetingTab(['- 2026-11-09 15:00-16:00 Jour Fixe']);
    await focus(TIME);
    await type(TIME, '15:30-16:30');
  });
  then('the time strip says "overlaps Jour Fixe 15:00"', () => {
    expectShows('15:30 – 16:30 · 1 h · overlaps Jour Fixe 15:00');
  });
});

scenario('A new meeting in the past is marked', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: hints}, () => {
  when('I date a new meeting yesterday', async () => {
    await openMeetingTab();
    await focus(DATE);
    await type(DATE, '2026-11-08');
  });
  then('the date strip says "past"', () => {
    expectShows('Sun 8 Nov 2026 · past');
  });
});

scenario('The usual slot of a thread fills date, time and end in one tap', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: hints}, () => {
  given('the last meetings of #101/mieke: three on Tuesdays 14:00-14:45, two at other times', () => undefined);
  when('I write "1:1 #101/mieke" and tap into the date field', async () => {
    await openMeetingTab([
      '- 2026-10-13 14:00-14:45 1:1 #101/mieke',
      '- 2026-10-20 14:00-14:45 1:1 #101/mieke',
      '- 2026-10-22 09:00-10:00 1:1 #101/mieke',
      '- 2026-10-27 14:00-14:45 1:1 #101/mieke',
      '- 2026-11-02 16:00-17:00 1:1 #101/mieke',
    ]);
    await type(TITLE, '1:1 #101/mieke');
    await focus(DATE);
  });
  then('the strip offers "Tue 10 Nov 14:00 · 45 min"', () => {
    expectShows('Tue 10 Nov 14:00 · 45 min');
  });
  when('I tap it', async () => {
    await tap('Tue 10 Nov 14:00 · 45 min');
  });
  then('date, time and end are filled', () => {
    expect(fieldValue(DATE)).toBe('2026-11-10');
    expect(fieldValue(TIME)).toBe('14:00-14:45');
  });
});
