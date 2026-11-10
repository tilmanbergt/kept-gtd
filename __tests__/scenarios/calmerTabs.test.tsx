// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 12 (stage A: Next and Waiting with the bell),
// 15 and 16: count tabs, the bell and the Done tab.
import {expectNotShows, expectShows, labelled, openApp, settle, tap, tapTab, textsBetween} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());
const clock = () => fixedClock(new Date(2026, 10, 10, 10, 0));

scenario('Daily counts Next and Waiting in its tabs; the bell counts the waiting ones due today', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#count-tabs-and-the-bell'}, () => {
  given('on 10.11. three #next todos and two waiting ones, one of them due today', () => {
    clock();
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [
      '- [ ] Order soil #next', '- [ ] Buy seeds #next', '- [ ] Call Marco #next',
      '- [ ] Quote from Lena #wf/lena [due:: 2026-11-10]', '- [ ] Fence offer #wf/sam',
    ], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the tabs read Next 3, Waiting 2 with the bell 1, Inbox 0; no Done tab', () => {
    expectShows('Next 3');
    expectShows('Waiting 2');
    expect(labelled('1 due')).not.toBeNull();
    expectShows('Inbox 0');
    expectNotShows(/^Done \d+$/);
  });
  and('Next lists the #next todos, not the waiting ones', () => {
    expectShows('Order soil');
    expectNotShows('Quote from Lena');
  });
  when('I tap Waiting', () => tap('Waiting 2'));
  then('it lists both waiting todos with their grey note', () => {
    expect(textsBetween('Garden renovation')).toEqual(expect.arrayContaining(['Quote from Lena', 'due today', 'Fence offer', 'w/f Sam']));
  });
});

scenario('A todo ticked on Next stays struck through until another tab; then it is under Done, and unticked there it is back', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#done'}, () => {
  given('on 10.11. two #next todos', () => {
    clock();
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next', '- [ ] Buy seeds #next'], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily and tick "Order soil"', async () => {
    await openApp();
    await tapTab('Daily');
    await tap('☐');
    await settle(4);
  });
  then('it is done in the file and still in the list, ticked; Next counts 1, Done 1', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[0]).toBe('- [x] Order soil #next [completion:: 2026-11-10]');
    expectShows('Order soil');
    expectShows('☑');
    expectShows('Next 1');
    expectShows('Done 1');
  });
  when('I open Waiting and then Next again', async () => {
    await tap(/^Waiting \d+$/);
    await tap('Next 1');
  });
  then('"Order soil" is gone from Next', () => expectNotShows('Order soil'));
  when('I open Done', () => tap('Done 1'));
  then('it lists "Order soil"', () => expectShows('Order soil'));
  when('I untick it there', async () => {
    await tap('☑');
    await settle(4);
  });
  then('it is open again and back under Next', async () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[0]).toBe('- [ ] Order soil #next');
    await tap('Next 2');
    expectShows('Order soil');
  });
});

scenario('Current\'s Done tab counts the todos done in the last 14 days', {feature: 'Projects and Areas', design: 'technical-design-calmer-screens.md', help: 'projects-and-areas.md#the-current-tab'}, () => {
  given('on 10.11. a project with 3 todos done on 7.11., one done on 21.10. and one #next', () => {
    clock();
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [
      '- [ ] Order soil #next',
      '- [x] Buy seeds [completion:: 2026-11-07]', '- [x] Call Marco [completion:: 2026-11-07]', '- [x] Measure beds [completion:: 2026-11-07]',
      '- [x] Old plan [completion:: 2026-10-21]',
    ], Meetings: []}, ['abbrev: GR']));
  });
  when('I open the project', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
  });
  then('the tabs show Next 1 and Done 3', () => {
    expectShows('Next 1');
    expectShows('Done 3');
  });
  when('I tap Done 3', () => tap('Done 3'));
  then('it lists the three, not "Old plan"', () => {
    expectShows('Buy seeds');
    expectShows('Measure beds');
    expectNotShows('Old plan');
  });
});
