/**
 * The smoke space (docs/dev/history/technical-design-test-tiers.md §3.4,
 * docs/dev/history/technical-design-time-and-place.md §6): a small fixed data set for the smoke scenarios in
 * __tests__/scenarios/smoke/. The clock stands at Wednesday 2026-10-14, 10:00: mid-week and mid-month.
 *
 * - Area Garden (GA): four todos, five meetings and a focus block (Thursday 13-14), an agreement.
 * - Project Website (WEB): a Next todo, an overdue one and one waiting for Lena.
 * - Project Garage (GAR) of Area Garden: one Next todo.
 * - Inbox: a Next todo, a Maybe todo and a meeting.
 * - One context, Home: shows Area Garden (and so Garage), via `smokeSettings()`.
 */
import {areaFile, dataFile, INBOX_FILE, projectFile, putFile} from './files';
import {fixedClock} from './clock';
import {ContextDef} from '../../src/domain/contexts';
import {GtdParaSettings} from '../../src/domain/settings';

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
          '- 2026-10-15 13:00-14:00 Plan the beds #focusblock',
        ],
        Agreements: ['- Water only in the morning [created:: 2026-10-01]'],
      },
      ['abbrev: GA'],
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
    dataFile('project', {Scope: [], Tasks: ['- [ ] Sort tools #next'], Meetings: []}, ['area: Garden', 'abbrev: GAR']),
  );
  putFile(
    INBOX_FILE,
    dataFile('inbox', {Tasks: ['- [ ] Call the plumber #next', '- [ ] Someday idea #maybe'], Meetings: ['- 2026-10-14 16:00 Dentist']}),
  );
}

/** The smoke space's one context: Home, showing Area Garden. */
export const SMOKE_HOME: ContextDef = {id: 'home', name: 'Home', shows: [{kind: 'item', itemKind: 'area', name: 'Garden'}], hides: [], outsideMeetings: 'dim'};

/** Settings with the smoke space's context, `active` or Everything. */
export function smokeSettings(active = false): Partial<GtdParaSettings> {
  return {contexts: [SMOKE_HOME], activeContextId: active ? SMOKE_HOME.id : ''};
}
