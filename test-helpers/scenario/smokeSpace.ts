/**
 * The smoke space (docs/dev/history/technical-design-test-tiers.md §3.4): a small fixed data set for the smoke
 * scenarios in __tests__/scenarios/smoke/. The clock stands at Wednesday 2026-10-14, 10:00: mid-week, so the
 * Friday-to-Sunday "coming week" of the weekly focus is not involved, and mid-month.
 *
 * - Area Garden (GA): daily, weekly and monthly focus; goals for W42 and 2026-10; four todos, five meetings, an agreement.
 * - Project Website (WEB): in no focus; a Next todo, an overdue one and one waiting for Lena.
 * - Project Garage (GAR) of Area Garden: weekly focus only, with a weekly goal; one Next todo.
 * - Inbox: a Next todo, a Maybe todo and a meeting.
 */
import {areaFile, dataFile, INBOX_FILE, projectFile, putFile} from './files';
import {fixedClock} from './clock';

/** Wednesday 2026-10-14, 10:00 - "now" in the smoke space. */
export const SMOKE_NOW = new Date(2026, 9, 14, 10, 0);
export const SMOKE_TODAY = '2026-10-14';

/** Sets the clock to SMOKE_NOW; the test file restores it with `afterEach(() => jest.useRealTimers())`. */
export function smokeClock(): void {
  fixedClock(SMOKE_NOW);
}

/** Writes the smoke space's files. */
export function putSmokeSpace(): void {
  putFile(
    areaFile('Garden'),
    dataFile(
      'area',
      {
        Scope: [],
        Tasks: ['- [ ] Buy bulbs #next', '- [ ] Water the lawn [due:: 2026-10-14]', '- [ ] Repair the fence #someday', '- [x] Order seeds [completion:: 2026-10-10]'],
        Meetings: [
          '- 2026-10-14 14:00 Neighbour chat',
          '- 2026-10-15 09:00 Supplier call',
          '- 2026-10-16 1d Delivery',
          '- 2026-10-28 1d Garden fair #monthly',
          '- 2026-10-20 11:00 Soil test',
        ],
        Agreements: ['- Water only in the morning [created:: 2026-10-01]'],
        'Weekly Goals': ['- 2026-W42: Plant the bulbs'],
        'Monthly Goals': ['- 2026-10: Beds ready for winter'],
      },
      ['dailyFocus: true', 'weeklyFocus: true', 'monthlyFocus: true', 'abbrev: GA'],
    ),
  );
  putFile(
    projectFile('Website'),
    dataFile(
      'project',
      {
        Scope: [],
        Tasks: ['- [ ] Draft homepage #next', '- [ ] Send invoice [due:: 2026-10-13]', '- [ ] Feedback on layout #wf/lena'],
        Meetings: [],
      },
      ['abbrev: WEB'],
    ),
  );
  putFile(
    projectFile('Garage'),
    dataFile('project', {Scope: [], Tasks: ['- [ ] Sort tools #next'], Meetings: [], 'Weekly Goals': ['- 2026-W42: Clear the shelves']}, [
      'area: Garden',
      'weeklyFocus: true',
      'abbrev: GAR',
    ]),
  );
  putFile(
    INBOX_FILE,
    dataFile('inbox', {Tasks: ['- [ ] Call the plumber #next', '- [ ] Someday idea #maybe'], Meetings: ['- 2026-10-14 16:00 Dentist']}),
  );
}
