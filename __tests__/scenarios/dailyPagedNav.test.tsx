// docs/dev/history/technical-design-quickadd-redesign.md §6 scenario 27 (F6): a list without a header
// draws no header row; its page arrows get their own row, only when it has more than one page.
import {expectNotShows, expectShows, openApp, tap, tapTab} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());
const clock = () => fixedClock(new Date(2026, 10, 10, 10, 0));

function nextTodos(n: number): string[] {
  return Array.from({length: n}, (_, i) => `- [ ] Order soil ${i + 1} #next`);
}

scenario('Daily shows no page row for a short Next list, and a page row under a long one', {feature: 'Daily', design: 'technical-design-quickadd-redesign.md', help: 'daily.md#count-tabs-and-the-bell'}, () => {
  given('on 10.11. four #next todos in Garden renovation', () => {
    clock();
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: nextTodos(4), Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the four todos show and no page row', () => {
    expectShows('Order soil 4');
    expectNotShows(/^\d+ \/ \d+$/);
  });
});

scenario('A long Next list on Daily pages with the row under it', {feature: 'Daily', design: 'technical-design-quickadd-redesign.md', help: 'daily.md#count-tabs-and-the-bell'}, () => {
  given('on 10.11. eighty #next todos in Garden renovation', () => {
    clock();
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: nextTodos(80), Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the page row reads 1 of several pages and the last todo is not on the first page', () => {
    expectShows(/^1 \/ [2-9]$/);
    expectNotShows('Order soil 80');
  });
  when('I tap the next page arrow', () => tap('›'));
  and('the row reads page 2', () => expectShows(/^2 \/ [2-9]$/));
  then('the first todo is no longer shown', () => expectNotShows('Order soil 1'));
});
