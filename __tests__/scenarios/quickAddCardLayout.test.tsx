// docs/dev/history/technical-design-quickadd-redesign.md §11.3 scenarios 37-38: the todo and meeting
// cards' rows (G9, G10) - R1 with the place's abbreviation, the refile arrow and the state, R4 the
// states on the left and the actions on the right.
import {cardHeading, labelled, openApp, readTexts, tap, tapTab} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile} from '../../test-helpers/scenario/files';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());

function garden(tasks: string[], meetings: string[] = []): void {
  fixedClock(new Date(2026, 10, 11, 10, 0));
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: tasks, Meetings: meetings}, ['abbrev: GR']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
}

async function openGarden(): Promise<void> {
  await openApp();
  await tapTab('Projects');
  await tap(/^Garden renovation/);
}

scenario('The todo card: GR, the flow state and the due date on R1; the done box, the flow states and the icons on R4', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('on Wed 11.11. the Next todo "Order soil" due tomorrow in Garden renovation (#GR)', () => garden(['- [ ] Order soil #next [due:: 2026-11-12]']));
  when('I tap it on the project\'s page', async () => {
    await openGarden();
    await tap('Order soil');
  });
  then('R1 reads "Todo · GR · next · due 12.11." with the refile arrow', () => {
    expect(cardHeading()).toBe('Todo · GR · next · due 12.11.');
    expect(labelled('Refile')).not.toBeNull();
  });
  then('R4 offers the done box, Next (filled) · w/f · Someday · Maybe, the notebook with +, the clip with + and the trash', () => {
    expect(labelled('Done')).toEqual({on: false, disabled: false});
    expect(labelled('Next')?.on).toBe(true);
    for (const label of ['w/f', 'Someday', 'Maybe', 'Create note', 'Link file', 'Delete']) expect(labelled(label)).not.toBeNull();
    expect(readTexts()).not.toContain('☐ Done');
  });
});

scenario('The meeting card: its date and time on R1; P/R · M · F, the notebook, the clip, New from this and Cancel meeting on R4', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'meetings.md#the-meeting-row-and-its-card'}, () => {
  given('on Wed 11.11. the meeting "Plan the beds" on Thu 19.11. 15:00-16:30 in Garden renovation', () =>
    garden([], ['- 2026-11-19 15:00-16:30 Plan the beds']));
  when('I tap it on the project\'s page', async () => {
    await openGarden();
    await tap(/^Plan the beds/);
  });
  then('R1 reads "Meeting · GR · Thu 19.11. 15:00-16:30"', () => expect(cardHeading()).toBe('Meeting · GR · Thu 19.11. 15:00-16:30'));
  then('R4 offers M, F, the notebook, the clip, New from this and Cancel meeting', () => {
    for (const label of ['Month highlight', 'Focus block', 'Create note', 'Link file', 'New from this', 'Cancel meeting']) expect(labelled(label)).not.toBeNull();
  });
});
