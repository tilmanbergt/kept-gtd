// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 1-3, 5: the collapsible Quick Add box
// and the compact card's two pages.
import {fireEvent, screen} from '@testing-library/react-native';
import {expectNotShows, expectShows, fieldValue, focus, labelled, openApp, settle, tap, tapLabel, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const garden = () =>
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next'], Meetings: []}, ['abbrev: GR']));

scenario('Daily: Quick Add starts closed; + Todo opens it, ✕ closes it and keeps the text', {feature: 'Quick Add', design: 'technical-design-calmer-screens.md', help: 'quick-add.md'}, () => {
  given('project "Garden renovation" and an empty Inbox', () => {
    garden();
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the box shows + Todo · + Meeting and no text field', () => {
    expectShows('+ Todo');
    expectShows('+ Meeting');
    expectNotShows('+ Add');
  });
  when('I tap + Todo and write "Buy seeds"', async () => {
    await tap('+ Todo');
    await type('New todo', 'Buy seeds');
  });
  then('the Todo form shows with + Add', () => expectShows('+ Add'));
  when('I tap ✕ at the end of its first row', () => tapLabel('Close Quick Add'));
  then('the buttons are back', () => {
    expectShows('+ Todo');
    expectNotShows('+ Add');
  });
  when('I tap + Todo again', () => tap('+ Todo'));
  then('the text is still there', () => expect(fieldValue('New todo')).toBe('Buy seeds'));
});

scenario('With the field still empty and in focus, ✕ closes the box on touch-down, the strip\'s ✕ hides the strip', {feature: 'Quick Add', design: 'technical-design-calmer-screens.md', help: 'quick-add.md'}, () => {
  given('project "Garden renovation" and an empty Inbox', () => {
    garden();
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily, tap + Meeting and touch down on the strip\'s ✕ of the empty title', async () => {
    await openApp();
    await tapTab('Daily');
    await tap('+ Meeting');
    await focus('New meeting');
    fireEvent(screen.getAllByLabelText('Hide')[0], 'pressIn');
    await settle();
  });
  then('the box stays open', () => expectShows('+ Add'));
  when('I touch down on ✕ of the first row (the field blurs at that moment)', async () => {
    fireEvent(screen.getByLabelText('Close Quick Add'), 'pressIn');
    await settle();
  });
  then('the kind buttons are back', () => {
    expectShows('+ Meeting');
    expectNotShows('+ Add');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('After + Add the box closes and the status line says where the todo went', {feature: 'Quick Add', design: 'technical-design-calmer-screens.md', help: 'quick-add.md'}, () => {
  given('project "Garden renovation" and an empty Inbox', () => {
    garden();
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily, tap + Todo, write "Call Marco" and tap + Add', async () => {
    await openApp();
    await tapTab('Daily');
    await tap('+ Todo');
    await type('New todo', 'Call Marco');
    await tap('+ Add');
    await settle(4);
  });
  then('the todo is in the Inbox', () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Call Marco/)]);
  });
  and('the box shows its buttons again, and the status line names the Inbox', () => {
    expectShows('+ Todo');
    expectNotShows('+ Add');
    expectShows(/Added todo "Call Marco" to Inbox/);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('The todo card shows everything on one page: the flow states, Done, its note and delete', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('project "Garden renovation" with the todo "Order soil #next"', garden);
  when('I open the project and tap the todo', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await tap(/^Order soil/);
  });
  then('the card shows its caption, Next · w/f · Someday · Maybe, Done, the note and delete - no More', () => {
    expectShows('Todo · Garden renovation · next');
    for (const label of ['Next', 'w/f', 'Someday', 'Maybe', 'Done', 'Create note', 'Delete']) expect(labelled(label)).not.toBeNull();
    expect(labelled('Next')?.on).toBe(true);
    expect(labelled('More')).toBeNull();
  });
  when('I tap Maybe', () => tapLabel('Maybe'));
  then('the todo is Maybe, at once', () => expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual(['- [ ] Order soil #maybe']));
  when('I tap the filled Maybe', () => tapLabel('Maybe'));
  then('the flow state is cleared', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual(['- [ ] Order soil']);
    expectShows('Todo · Garden renovation · open');
  });
});
