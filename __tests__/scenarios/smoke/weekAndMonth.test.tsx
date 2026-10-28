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

scenario('Week shows this week\'s meetings and the time given to each owner', {feature: 'Week and Month', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => undefined);
  when('I open Week', () => openTab('Week'));
  then('the grid shows Wednesday 14 "Neighbour chat" and "Dentist", Thursday 15 "Supplier call" and the focus block, Friday 16 "Delivery"', () => {
    expect(weekDay('We 14.10.')).toEqual(['14:00', 'Neighbour chat', '16:00', 'Dentist']);
    expect(weekDay('Th 15.10.')).toEqual(['9:00', 'Supplier call', '13:00', 'F Plan the beds']);
    expect(weekDay('Fr 16.10.')).toEqual(['all day', 'Delivery']);
  });
  and('not "Soil test", which is next week', () => expectNotShows('Soil test'));
  and('Given time lists Garden with "Delivery" as 1 day, its two timed meetings and its focus block; never the Inbox\'s Dentist', () => {
    const panel = textsBetween('Given time this week');
    expect(panel.slice(0, 6)).toEqual(['Garden', 'AREA', '1 day · 3 h', '1 block · 3 meetings · next: Buy bulbs', 'Loops and counterparts', 'Nothing above 1 h this week']);
    expect(panel).not.toContain('INBOX');
  });
  when('I tap ›', () => tap('›'));
  then('the grid shows Tuesday 20 "Soil test"', () => expect(weekDay('Tu 20.10.')).toEqual(['11:00', 'Soil test']));
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('Month shows the highlights and the time given this month', {feature: 'Week and Month', design: DESIGN}, () => {
  given('the smoke space on Wednesday 14.10.2026', () => undefined);
  when('I open Month', () => openTab('Month'));
  then('the 28th shows "Garden fair"; no other day shows a meeting or the F of the focus block on the 15th, since none is a highlight (marked M)', () => {
    const days = textsBetween(/^Th 01/, 'Todo');
    expect(days.filter(t => !MONTH_LABEL.test(t))).toEqual(['Garden fair']);
    expect(days[days.indexOf('Garden fair') - 1]).toBe('We 28');
  });
  and('Given time counts all of Garden\'s meetings, highlight or not, and its todo done this month', () => {
    const panel = textsBetween('Given time this month');
    expect(panel.slice(0, 4)).toEqual(['Garden', 'AREA', '2 days · 4 h', '1 block · 5 meetings · 1 done · next: Buy bulbs']);
  });
  when('I tap the 14th', () => tap(/^We 14/));
  then('the right side lists both meetings of that day', () => {
    expect(textsBetween(/^Wed 14\.10\. · 2 meetings/)).toEqual(expect.arrayContaining(['Neighbour chat', 'Dentist']));
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});
