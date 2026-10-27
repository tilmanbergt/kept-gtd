import {expectNotShows, expectShows, openApp, reopenApp, tapTab} from '../../../test-helpers/scenario/app';
import {dataFile, loggedErrors, projectFile, putFile} from '../../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../../test-helpers/scenario/scenario';
import {putSmokeSpace, smokeClock} from '../../../test-helpers/scenario/smokeSpace';

// Smoke scenario 10 (docs/dev/history/technical-design-test-tiers.md §3.4), against docs/user/files-and-folders.md.
const DESIGN = 'technical-design-test-tiers.md';

afterEach(() => jest.useRealTimers());

scenario('A file changed elsewhere is read again when the plugin opens', {feature: 'Your files', design: DESIGN}, () => {
  given('the smoke space and Daily open', async () => {
    smokeClock();
    putSmokeSpace();
    await openApp();
    await tapTab('Daily');
    expectNotShows(/^Renew the domain/);
  });
  when('Website/project.txt gets a new todo due today from outside and I reopen the plugin', async () => {
    putFile(
      projectFile('Website'),
      dataFile('project', {Scope: [], Tasks: ['- [ ] Draft homepage #next', '- [ ] Send invoice [due:: 2026-10-13]', '- [ ] Feedback on layout #wf/lena', '- [ ] Renew the domain [due:: 2026-10-14]'], Meetings: []}, ['abbrev: WEB']),
    );
    await reopenApp();
    await tapTab('Daily');
  });
  then('Daily lists it', () => expectShows(/^Renew the domain/));
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});
