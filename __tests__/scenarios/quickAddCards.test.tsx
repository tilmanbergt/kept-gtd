// docs/dev/history/technical-design-quickadd-redesign.md §6 scenarios 16-18: after + Add the new
// item's card, with + Todo for the next one.
import {cardHeading, expectShows, fieldValue, labelled, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {device} from '../../test-helpers/fakeDevice/device';

afterEach(() => jest.useRealTimers());

function garden(): void {
  fixedClock(new Date(2026, 10, 11, 10, 0));
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: GR']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
}

scenario('On Daily, + Add to a project shows the new todo\'s card; its + Todo starts the next with the tag', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('on 11.11. project "Garden renovation" (#GR)', garden);
  when('on Daily I add "Order soil #GR"', async () => {
    await openApp();
    await tapTab('Daily');
    await type('New todo', 'Order soil #GR');
    await tap(/^\+ Add to Garden/);
  });
  then('the box shows its card: Todo · Garden renovation › · open, with + Todo, all on one page', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Order soil/)]);
    expect(cardHeading()).toBe('Todo · GR › · open');
    for (const label of ['Next', 'w/f', 'Someday', 'Maybe', 'Done', 'Delete', 'Link file']) expect(labelled(label)).not.toBeNull();
  });
  when('I tap + Todo on the card', () => tap('+ Todo'));
  then('the new draft starts with "#GR "', () => expect(fieldValue('New todo')).toBe('#GR '));
});

scenario('On a project\'s page, + Add shows the new todo\'s card; its + Todo starts empty', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('on 11.11. project "Garden renovation"', garden);
  when('on its page I add "Order soil"', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await type('New todo', 'Order soil');
    await tap('+ Add');
  });
  then('the card shows', () => expect(cardHeading()).toBe('Todo · GR · open'));
  when('I tap + Todo on the card', () => tap('+ Todo'));
  then('the new draft is empty', () => expect(fieldValue('New todo')).toBe(''));
});

scenario('Opened from a todo\'s note, a new todo records that note; its card names the todo it came from', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-grey-line-where-a-todo-comes-from'}, () => {
  const NOTE = `${projectFile('Garden renovation').replace(/\/project\.txt$/, '')}/Todos/Order soil.note`;
  given('the todo "Order soil" in Garden renovation has its own note', () => {
    fixedClock(new Date(2026, 10, 11, 10, 0));
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil → [[Todos/Order soil.note]]'], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
    device().sdk.putNote(NOTE, [{}]);
  });
  when('I open Kept from that note, open the project and + Todo', async () => {
    await openApp({fromNote: NOTE});
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await tap('+ Todo');
  });
  then('the grey line names the note', () => expectShows('↳ from Order soil'));
  when('I add "Compare soil prices"', async () => {
    await type('New todo', 'Compare soil prices');
    await tap('+ Add');
  });
  then('the line records the note as its source, and the card names the todo it came from', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')[1]).toMatch(/^- \[ \] Compare soil prices \[created:: 2026-11-11\] \[source:: 1 Projects\/Garden renovation\/Todos\/Order soil\]$/);
    expectShows('↳ Order soil ›');
  });
});
