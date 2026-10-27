import {resetMomentChoices} from '../../../src/ui/meetingMomentStore';
import {expectShows, tap} from '../../../test-helpers/scenario/app';
import {areaFile, sectionLines} from '../../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {COACH_KEY, processSportMarks, sport, sportClock, sportMark} from '../../../test-helpers/scenario/sportArea';

// Smoke: capturing one todo from a lasso mark (docs/dev/history/technical-design-test-tiers.md §3.4), on Area Sport of
// docs/dev/history/technical-design-engage-page-owner.md §6. The fake device has no lasso; marks go through the same
// capture panel and provenance.
const DESIGN = 'technical-design-engage-page-owner.md';

beforeEach(() => {
  resetMomentChoices();
  sportClock();
});
afterEach(() => jest.useRealTimers());

scenario('A todo captured on a meeting\'s follow-up page records the meeting', {feature: 'Lasso', design: DESIGN}, () => {
  given('page 4 follows the page of meeting "Coach call" and has a mark "Ask coach about intervals"', () => sport({marks: [sportMark(4, 'Ask coach about intervals')]}));
  when('I process the mark', processSportMarks);
  then('the panel shows "↳ from Coach call"', () => expectShows(/^↳ from Coach call/));
  when('I save it as a todo', () => tap(/^Save & close/));
  then('the todo ends with the meeting', () => {
    expect(sectionLines(areaFile('Sport'), 'Tasks')).toContainEqual(expect.stringMatching(new RegExp(`^- \\[ \\] Ask coach about intervals .*\\[meeting:: ${COACH_KEY}\\]`)));
  });
});
