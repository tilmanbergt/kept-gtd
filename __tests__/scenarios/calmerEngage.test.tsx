// docs/dev/history/technical-design-calmer-screens.md §6 scenario 31: Engage is quieter on a loop's page.
// (Scenario 30, Week's Given time as one line per owner with its card, is in smoke/weekAndMonth and givenTime.)
import {resetMomentChoices} from '../../src/ui/meetingMomentStore';
import {expectNotShows, expectShows, shows} from '../../test-helpers/scenario/app';
import {areaFile, fileText, putFile} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {engageOn, sport, sportClock} from '../../test-helpers/scenario/sportArea';

beforeEach(() => {
  resetMomentChoices();
  sportClock();
});
afterEach(() => jest.useRealTimers());

scenario('Engage on a loop\'s page: no section line, no "Loop since" line, and Today next is shown', {feature: 'Engage', design: 'technical-design-calmer-screens.md', help: 'engage.md#next-here-and-today-next'}, () => {
  given('Area Sport with loop marathon, page 5 is a loop todo\'s page, and a physio appointment at 11:00 today', () => {
    sport();
    putFile(areaFile('Sport'), fileText(areaFile('Sport')).replace('## Meetings\n', '## Meetings\n- 2026-10-25 11:00-12:00 Physio\n'));
  });
  when('I open Engage on page 5', () => engageOn(5));
  then('the owner is the loop, with Today next and without the section or "Loop since" line', () => {
    expectShows('LOOP');
    expect(shows(/^Today next/)).toBe(true);
    expectNotShows(/^Loop since/);
    expectNotShows(/^Section/);
  });
});
