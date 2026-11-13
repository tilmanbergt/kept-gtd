// docs/dev/history/technical-design-quickadd-redesign.md §6 scenarios 1-13, 15: Quick Add's form and
// its strips (14, the overlap warning, is in writingHelpDates.test.tsx).
import {fireEvent, screen} from '@testing-library/react-native';
import {expectNotShows, expectShows, fieldValue, focus, labelled, openApp, settle, tap, tapLabel, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());
const clock = () => fixedClock(new Date(2026, 10, 11, 10, 0));
const TODO = 'New todo';
const TITLE = 'New meeting';
const TIME = '15 · 15-16.30 · 2d';

function garden(meetings: string[] = []): void {
  clock();
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: meetings}, ['abbrev: GR']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
}

async function openGarden(): Promise<void> {
  await openApp();
  await tapTab('Projects');
  await tap(/^Garden renovation/);
}

function select(placeholder: string, start: number, end: number): void {
  fireEvent(screen.getByPlaceholderText(placeholder), 'selectionChange', {nativeEvent: {selection: {start, end}}});
}

scenario('+ Todo on Daily opens the form: the field, the calendar and w/f, then ✕ and + Add', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#adding-a-todo'}, () => {
  given('on Wed 11.11. project "Garden renovation" (#GR)', () => garden());
  when('I open Daily and tap + Todo', async () => {
    await openApp();
    await tapTab('Daily');
    await tap('+ Todo');
  });
  then('the form shows the todo field, the calendar, w/f, ✕ and + Add, and no kind tabs or flow chips', () => {
    expect(fieldValue(TODO)).toBe('');
    expect(labelled('Due date')).not.toBeNull();
    expectShows('w/f');
    expectShows('+ Add');
    expect(labelled('Close Quick Add')).not.toBeNull();
    expectNotShows('Someday');
    expectNotShows('Maybe');
  });
  when('I write "Order soil #GR"', () => type(TODO, 'Order soil #GR'));
  then('the main button reads + Add to Garden renovation', () => expectShows(/^\+ Add to Garden renovat/));
  when('a newline comes with the next words', () => type(TODO, 'Order soil\nand seeds #GR'));
  then('the field holds one line with a space', () => expect(fieldValue(TODO)).toBe('Order soil and seeds #GR'));
});

scenario('The calendar opens the due date in its place; its strip lies over the field\'s second line', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#dates-and-times'}, () => {
  given('on Wed 11.11. project "Garden renovation"', () => garden());
  when('on its page I open + Todo, write "Order soil", tap the calendar and handwrite "13.11"', async () => {
    await openGarden();
    await type(TODO, 'Order soil');
    await tapLabel('Due date');
    await focus('Due YYYY-MM-DD');
    await type('Due YYYY-MM-DD', '13.11');
  });
  then('the strip reads "read as Fri 13 Nov 2026" with Undo, and the text is still there', () => {
    expectShows('read as Fri 13 Nov 2026');
    expectShows('Undo');
    expect(fieldValue(TODO)).toBe('Order soil');
    expect(fieldValue('Due YYYY-MM-DD')).toBe('2026-11-13');
  });
});

scenario('w/f opens "Waiting on" and closes it again, clearing the name', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#adding-a-todo'}, () => {
  given('on Wed 11.11. project "Garden renovation"', () => garden());
  when('I open + Todo, tap w/f and write "Lena"', async () => {
    await openGarden();
    await type(TODO, 'Fence offer');
    await tap('w/f');
    await type('Waiting on', 'Lena');
  });
  then('"Waiting on" holds Lena', () => expect(fieldValue('Waiting on')).toBe('Lena'));
  when('I tap w/f again', () => tap('w/f'));
  then('the field is gone', () => expect(screen.queryAllByPlaceholderText('Waiting on')).toHaveLength(0));
  when('I tap w/f once more and + Add', async () => {
    await tap('w/f');
    await tap('+ Add');
  });
  then('the todo is saved waiting for nobody named', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Fence offer #wf \[created::/)]);
  });
});

scenario('An empty todo field offers suggestions above the box; a selection shows the clipboard', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-strips'}, () => {
  given('on Wed 11.11. project "Garden renovation"', () => garden());
  when('I open + Todo and put the cursor into the empty field', async () => {
    await openGarden();
    await focus(TODO);
  });
  then('the strip offers #next and #someday and the clipboard square', () => {
    expectShows('#next');
    expectShows('#someday');
    expect(labelled('Clipboard')).not.toBeNull();
  });
  when('I write "Order soil" and select "soil"', async () => {
    await type(TODO, 'Order soil');
    select(TODO, 6, 10);
    await settle(2);
  });
  then('the strip shows All · Copy · Cut · Paste', () => {
    expectShows('All');
    expectShows('Cut');
    expectNotShows('#someday');
  });
  when('the selection ends', async () => {
    select(TODO, 10, 10);
    await settle(2);
  });
  then('the suggestions return', () => {
    expectShows('#someday');
    expectNotShows('Cut');
  });
  when('I tap #someday and + Add', async () => {
    await tap('#someday');
    await tap('+ Add');
  });
  then('the todo is saved as a Someday todo', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Order soil #someday \[created::/)]);
  });
});

scenario('The time strip sets the length and moves the meeting in half hours', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#dates-and-times'}, () => {
  given('on Wed 11.11. project "Garden renovation"', () => garden());
  when('I open + Meeting and write 15:00 into the time', async () => {
    await openGarden();
    await type(TITLE, 'Site visit');
    await focus(TIME);
    await type(TIME, '15:00');
  });
  then('the strip shows 15:00 · 1 h · ‹ 30′ · 30′ › · 1 d', () => {
    for (const label of ['15:00', '1 h', '‹ 30′', '30′ ›', '1 d']) expectShows(label);
  });
  when('I tap 1 h', () => tap('1 h'));
  then('the field reads 15:00-16:00', () => expect(fieldValue(TIME)).toBe('15:00-16:00'));
  when('I tap +30′ and then 30′ ›', async () => {
    await tap('+30′');
    await tap('30′ ›');
  });
  then('the field reads 15:30-17:00', () => expect(fieldValue(TIME)).toBe('15:30-17:00'));
  when('I write 15:00-15:30', () => type(TIME, '15:00-15:30'));
  then('−30′ is greyed', () => expect(labelledButton('−30′')?.disabled).toBe(true));
  when('I write 2d', () => type(TIME, '2d'));
  then('the strip shows 2 days · −1 d · +1 d', () => {
    for (const label of ['2 days', '−1 d', '+1 d']) expectShows(label);
  });
  when('I tap −1 d', () => tap('−1 d'));
  then('it reads 1 day and −1 d is greyed', () => {
    expect(fieldValue(TIME)).toBe('1d');
    expect(labelledButton('−1 d')?.disabled).toBe(true);
  });
  and('+ Add saves the one-day meeting', async () => {
    await tap('+ Add');
    expect(sectionLines(projectFile('Garden renovation'), 'Meetings')).toEqual(['- 2026-11-11 1d Site visit']);
  });
});

scenario('An empty time field of a thread\'s meeting opens on its usual slot', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#warnings-and-the-usual-time'}, () => {
  given('on Wed 11.11. the last meetings of #sparring/jordan on Thursdays 15:00-16:30', () =>
    garden(['- 2026-10-22 15:00-16:30 Sparring #sparring/jordan', '- 2026-10-29 15:00-16:30 Sparring #sparring/jordan', '- 2026-11-05 15:00-16:30 Sparring #sparring/jordan']));
  when('I write "Sparring #sparring/jordan" and put the cursor into the empty time field', async () => {
    await openGarden();
    await type(TITLE, 'Sparring #sparring/jordan');
    await focus(TIME);
  });
  then('the strip shows the usual slot (no ± square: an empty field has nothing to adjust)', () => {
    expectShows('usual Thu 15:00 – 16:30');
    expect(labelled('Adjust')).toBeNull();
  });
  when('I tap it', () => tap('usual Thu 15:00 – 16:30'));
  then('date and time are filled', () => {
    expect(fieldValue(TIME)).toBe('15:00-16:30');
    expect(fieldValue('YYYY-MM-DD')).toBe('2026-11-12');
  });
});

scenario('While the status line shows an error, no strip shows', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-strips'}, () => {
  given('on Wed 11.11. project "Garden renovation"', () => garden());
  when('I add a meeting with a time that can\'t be read', async () => {
    await openGarden();
    await type(TITLE, 'Site visit');
    await type(TIME, '25-26');
    await tap('+ Add');
  });
  and('I put the cursor into the title', () => focus(TITLE));
  then('an error shows and no strip', () => {
    expectShows('Hour must be 0-23.');
    expectNotShows('Thread');
    expect(labelled('Clipboard')).toBeNull();
  });
  when('I clear the error with its ✕ and tap into the title again', async () => {
    await tapLabel('Close');
    await focus(TITLE, false);
    await focus(TITLE);
  });
  then('the strip is back', () => expect(labelled('Clipboard')).not.toBeNull());
});

/** A strip step's state: present and whether it is greyed. */
function labelledButton(label: string): {disabled: boolean} | null {
  const text = screen.queryAllByText(label)[0];
  if (!text) return null;
  let node = text.parent;
  while (node && node.props.accessibilityState === undefined) node = node.parent;
  return {disabled: !!node?.props.accessibilityState?.disabled};
}
