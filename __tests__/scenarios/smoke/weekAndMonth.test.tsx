import {expectNotShows, openApp, tap, tapTab, textsBetween} from '../../../test-helpers/scenario/app';
import {loggedErrors} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenarios 3 and 4 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/week-and-month.md.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

/** A day header in the week grid, e.g. "We 14.10. · Today  · 2". */
const DAY = /^(Mo|Tu|We|Th|Fr|Sa|Su) \d\d\.\d\d\./;
/** The week grid's box of the day starting with `label` ("We 14.10."): its texts up to the next day. */
const weekDay = (label: string) => textsBetween(new RegExp(`^${label.replace(/\./g, '\\.')}`), DAY).filter(t => !/^ +· \d+$/.test(t));

/** A day or week label in the month list, e.g. "We 14 •" or "W42". */
const MONTH_LABEL = /^((Mo|Tu|We|Th|Fr|Sa|Su) \d\d( •)?|W\d+)$/;

async function openTab(tab: string): Promise<void> {
  smokeClock();
  putSmokeSpace();
  await openApp();
  await tapTab(tab);
}

scenario('Week shows this week\'s meetings and the weekly focus with its goals', {feature: 'Week and Month', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => undefined);
  when('I open Week', () => openTab('Week'));
  then('the grid shows Wednesday 14 "Neighbour chat" and "Dentist", Thursday 15 "Supplier call" and Friday 16 "Delivery"', () => {
    expect(weekDay('We 14.10.')).toEqual(['14:00', 'Neighbour chat', '16:00', 'Dentist']);
    expect(weekDay('Th 15.10.')).toEqual(['9:00', 'Supplier call']);
    expect(weekDay('Fr 16.10.')).toEqual(['all day', 'Delivery']);
  });
  and('not "Soil test", which is next week', () => expectNotShows('Soil test'));
  and('the weekly focus panel shows Garden with "Plant the bulbs" and Garage with "Clear the shelves"', () => {
    expect(textsBetween('Garage', '+ Add project')).toContain('🎯 Clear the shelves');
    expect(textsBetween('Garden', '+ Add area')).toContain('🎯 Plant the bulbs');
  });
  when('I tap ›', () => tap('›'));
  then('the grid shows Tuesday 20 "Soil test"', () => expect(weekDay('Tu 20.10.')).toEqual(['11:00', 'Soil test']));
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Month shows the highlights and the monthly focus with its goal', {feature: 'Week and Month', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => undefined);
  when('I open Month', () => openTab('Month'));
  then('the 28th shows "Garden fair" and no other day shows a meeting, since none is a highlight', () => {
    const days = textsBetween(/^Th 01/, 'Todo');
    expect(days.filter(t => !MONTH_LABEL.test(t))).toEqual(['Garden fair']);
    expect(days[days.indexOf('Garden fair') - 1]).toBe('We 28');
  });
  and('the monthly focus panel shows Garden with "Beds ready for winter"', () => {
    expect(textsBetween('Garden', '+ Add area')).toContain('🎯 Beds ready for winter');
  });
  when('I tap the 14th', () => tap(/^We 14/));
  then('the right side lists both meetings of that day', () => {
    expect(textsBetween(/^Wed 14\.10\. · 2 meetings/)).toEqual(expect.arrayContaining(['Neighbour chat', 'Dentist']));
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});
