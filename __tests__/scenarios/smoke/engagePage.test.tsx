import {resetMomentChoices} from '../../../src/ui/meetingMomentStore';
import {expectShows, labelled} from '../../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {engageOn, sectionLine, sport, sportClock} from '../../../test-helpers/scenario/sportArea';

// Smoke: Engage opens on a meeting's page (docs/dev/history/technical-design-test-tiers.md §3.4), on Area Sport of
// docs/dev/history/technical-design-engage-page-owner.md §6.
const DESIGN = 'technical-design-engage-page-owner.md';

beforeEach(() => {
  resetMomentChoices();
  sportClock();
});
afterEach(() => jest.useRealTimers());

scenario('Engage on a meeting\'s follow-up page: the meeting is passed on', {feature: 'Engage', design: DESIGN}, () => {
  given('page 3 is the page of meeting "Coach call" (Sport, no loop tag), where "Book physio" was agreed; page 4 is handwritten without a title', () => sport());
  when('I open Engage on page 4', () => engageOn(4));
  then('the owner is Area Sport, the moment line shows Coach call with its moment, From offers its group', () => {
    expectShows('AREA');
    expectShows('Coach call · Sat 24.10. 10:00–11:00');
    expect(labelled('After')?.on).toBe(true);
    expectShows('From meetings 1');
    expectShows('Sat 24.10. · Coach call');
  });
  and('the line reads "Section: Coach call · 24.10. · from p. 3"', () => expect(sectionLine()).toEqual(['Section: Coach call · 24.10. · from p. 3']));
});
