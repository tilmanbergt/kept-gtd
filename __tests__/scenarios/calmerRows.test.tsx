// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 9-11: quiet rows on Daily.
import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, labelled, openApp, tapLabel, tapTab, textsBetween} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectDir, projectFile, putFile} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());
const NOTE = `${projectDir('Garden renovation')}/Todos/Order soil.note`;
const NOTE_LINK = 'Todos/Order soil.note';

scenario('A Daily row keeps its words; the due date moves to a grey note on the right; no note icon without a note', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#labels'}, () => {
  given('on 3.11.2026, project "Garden renovation" with "Order soil #next" due 5.11. and "Collect topics #lena #next"', () => {
    fixedClock(new Date(2026, 10, 3, 10, 0));
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next [due:: 2026-11-05]', '- [ ] Collect topics #lena #next'], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the row reads "Order soil" with "due 5.11." after it, and no note icon', () => {
    const rows = textsBetween('Garden renovation');
    expect(rows.slice(0, 3)).toEqual(['☐', 'Order soil', 'due 5.11.']);
    expectNotShows('+📓');
    expect(labelled('Open note')).toBeNull();
  });
  and('"Collect topics" keeps its tag #lena', () => expectShows('Collect topics #lena'));
});

scenario('A todo with a note shows the notebook icon; one tap opens the note without a card', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'quick-add.md#notes-and-files-on-a-todo-or-meeting'}, () => {
  given('project "Garden renovation" with "Order soil #next" and its note', () => {
    device().sdk.putNote(NOTE, [{}]);
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [`- [ ] Order soil #next → [[${NOTE_LINK}]]`], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily and tap the notebook icon on the row', async () => {
    await openApp();
    await tapTab('Daily');
    await tapLabel('Open note');
  });
  then('the note opens, and no card shows', () => {
    expect(device().sdk.opened.at(-1)?.path).toBe(NOTE);
    expectNotShows('More ›');
  });
});
