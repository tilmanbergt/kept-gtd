// docs/dev/history/technical-design-quickadd-redesign.md §11.3 scenario 33: ✕ beside the main button
// drops an edit's changes (G5); scenario 32, a new todo's draft, is in calmerQuickAdd.test.tsx.
import {closeQuickAdd, expectNotShows, labelled, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());
const TODO = 'New todo';

function garden(tasks: string[] = []): void {
  fixedClock(new Date(2026, 10, 11, 10, 0));
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: tasks, Meetings: []}, ['abbrev: GR']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
}

scenario('✕ in a todo\'s edit drops the changes and shows its card again', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#editing'}, () => {
  given('project "Garden renovation" with the todo "Order soil"', () => garden(['- [ ] Order soil']));
  when('on its page I tap the todo, edit it to "Order soil and seeds" and tap ✕', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await tap('Order soil');
    await tap('Edit');
    await type(TODO, 'Order soil and seeds');
    await closeQuickAdd();
  });
  then('the card shows again and the file is unchanged', () => {
    expect(labelled('Delete')).not.toBeNull();
    expectNotShows('Save');
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual(['- [ ] Order soil']);
  });
});
