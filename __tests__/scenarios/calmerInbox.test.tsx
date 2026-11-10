// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 12-13: the Inbox on Daily (14, the context: contexts.test.tsx).
import {expectNotShows, expectShows, fieldValue, labelled, openApp, shows, tap, tapLabel, tapTab, textsBetween} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, fileText, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {device} from '../../test-helpers/fakeDevice/device';
import {fixedClock} from '../../test-helpers/scenario/clock';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

afterEach(() => jest.useRealTimers());
const clock = () => fixedClock(new Date(2026, 10, 10, 10, 0));
const mark = (n: number) => `- 2026-11-09 09:0${n} [[Note/Ideas.note]] p${n} Idea ${n} ^m-20261109-090${n}00-000`;

scenario('Daily counts the Inbox\'s marks, todos and meetings in its Inbox tab; the bell counts the due todos', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#count-tabs-and-the-bell'}, () => {
  given('on 10.11. two #next todos, one waiting todo due today, and an Inbox with 4 todos (one due today), 1 meeting and 4 open marks', () => {
    clock();
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next', '- [ ] Buy seeds #next', '- [ ] Quote from Lena #wf/lena [due:: 2026-11-10]'], Meetings: []}));
    putFile(INBOX_FILE, dataFile('inbox', {
      Tasks: ['- [ ] Call the plumber', '- [ ] Ask Lena #lena', '- [ ] Book the hall #next', '- [ ] Pay the invoice [due:: 2026-11-10]', '- [ ] Learn Spanish #someday'],
      Meetings: ['- 2026-11-02 10:00 Chat with Sam'],
      Marks: [mark(1), mark(2), mark(3), mark(4)],
    }));
  });
  when('I open Daily', async () => {
    await openApp();
    await tapTab('Daily');
  });
  then('the tabs read Next 2, Waiting 1 with the bell, Inbox 9 with the bell', () => {
    expectShows('Next 2');
    expectShows('Waiting 1');
    expectShows('Inbox 9');
    expect(labelled('1 due')).not.toBeNull();
  });
  and('the Inbox\'s #next todo is not under Next', () => expectNotShows('Book the hall'));
  when('I tap Inbox 9', () => tap('Inbox 9'));
  then('it lists the marks card, the four todos and the past meeting, not the Someday one', () => {
    const list = textsBetween('Inbox 9');
    expect(list).toEqual(expect.arrayContaining(['4 marks to process', 'Call the plumber', 'Ask Lena #lena', 'Book the hall', 'Pay the invoice', 'due today', 'Chat with Sam']));
    expect(list).not.toContain('Learn Spanish #someday');
  });
});

const offsite = () => {
  putFile(projectFile('Team offsite'), dataFile('project', {Scope: [], Tasks: ['- [ ] Collect topics #lena'], Meetings: []}, ['abbrev: TO']));
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: GR']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Ask Lena #lena', '- [ ] Order soil'], Meetings: []}));
};
const openInboxCard = async () => {
  await openApp();
  await tapTab('Daily');
  await tap(/^Inbox \d+$/);
  await tap('Ask Lena #lena');
};

scenario('An Inbox todo\'s card offers the place that uses its tag first', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#filing-from-the-inbox'}, () => {
  given('an Inbox todo "Ask Lena #lena", and #lena used in project Team offsite (#TO)', offsite);
  when('I open Daily\'s Inbox tab and tap the todo', openInboxCard);
  then('its card says Inbox and offers #TO first under File to', () => {
    expectShows(/^Inbox/);
    expectShows('File to');
    expect(labelled('File to Team offsite')).not.toBeNull();
    expect(textsBetween('File to').slice(0, 1)).toEqual(['#TO']);
  });
});

scenario('Filing from the Inbox card: the todo moves, the status line says so with Undo, the next Inbox item opens', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#filing-from-the-inbox'}, () => {
  given('an Inbox with "Ask Lena #lena" and "Order soil", and project Team offsite (#TO) using #lena', offsite);
  when('I open the card of "Ask Lena" and tap #TO', async () => {
    await openInboxCard();
    await tap('#TO');
  });
  then('the todo is in Team offsite\'s file and not in the Inbox', () => {
    expect(sectionLines(projectFile('Team offsite'), 'Tasks')).toEqual(['- [ ] Collect topics #lena', expect.stringMatching(/^- \[ \] Ask Lena #lena/)]);
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual(['- [ ] Order soil']);
  });
  and('the status line says "Filed … to Team offsite" with Undo, and "Order soil"\'s card is open', () => {
    expectShows('Filed "Ask Lena #lena" to Team offsite');
    expectShows('Undo');
    expect(textsBetween('File to').length).toBeGreaterThan(0);
    expectShows('Order soil');
  });
  when('I tap Undo', () => tap('Undo'));
  then('it is back in the Inbox', () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual(['- [ ] Order soil', expect.stringMatching(/^- \[ \] Ask Lena #lena/)]);
    expect(sectionLines(projectFile('Team offsite'), 'Tasks')).toEqual(['- [ ] Collect topics #lena']);
    expect(loggedErrors()).toEqual([]);
  });
});

const herbs = () => {
  putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: HO']));
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: GR']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Idea: Herb spiral #garden', '- [ ] Fix the gate'], Meetings: []}));
};
const openCardOf = async (title: string | RegExp) => {
  await openApp();
  await tapTab('Daily');
  await tap(/^Inbox \d+$/);
  await tap(title);
};

scenario('More… lists the projects and areas; a tap on one files the todo there', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#more-places-new-project-someday'}, () => {
  given('area Home and an Inbox todo "Fix the gate"', herbs);
  when('I open its card, tap More…, then Areas and Home', async () => {
    await openCardOf('Fix the gate');
    await tapLabel('More places');
    // The picker's Areas tab (the tab bar's comes first).
    await tap('Areas', 1);
    await tapLabel('File to Home');
  });
  then('the todo is in Home\'s file and no longer in the Inbox', () => {
    expect(sectionLines(areaFile('Home'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Fix the gate/)]);
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual(['- [ ] Idea: Herb spiral #garden']);
  });
});

scenario('→ New project: the name and abbreviation are prefilled; Create project makes the folder and files the todo with #next', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#more-places-new-project-someday'}, () => {
  given('an Inbox todo "Idea: Herb spiral #garden"', herbs);
  when('I open its card and tap → New project', async () => {
    await openCardOf(/^Idea: Herb spiral/);
    await tapLabel('New project');
  });
  then('the form offers the name "Herb spiral" and the abbreviation HS; nothing is created yet', () => {
    expect(fieldValue('Project name')).toBe('Herb spiral');
    expect(fieldValue('e.g. HS')).toBe('HS');
    expect(device().fs.get(projectFile('Herb spiral'))).toBeUndefined();
  });
  when('I tap Create project', () => tap('Create project'));
  then('the project "Herb spiral" exists with HS, its file has the todo with #next, the Inbox no longer has it', () => {
    expect(fileText(projectFile('Herb spiral'))).toContain('abbrev: HS');
    expect(sectionLines(projectFile('Herb spiral'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Idea: Herb spiral #garden #next/)]);
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual(['- [ ] Fix the gate']);
  });
  and('the status line names the new project with Open ›, and the next Inbox item\'s card is open', () => {
    expectShows(/^New project Herb spiral #HS in /);
    expectShows('Open ›');
    expectShows('Fix the gate');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('→ New project with "was only the name": the project is empty and the Inbox todo is cancelled', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#more-places-new-project-someday'}, () => {
  given('an Inbox todo "Idea: Herb spiral #garden"', herbs);
  when('I open its card, tap → New project, choose "Was only the name: remove it" and Create project', async () => {
    await openCardOf(/^Idea: Herb spiral/);
    await tapLabel('New project');
    await tap(/Was only the name: remove it/);
    await tap('Create project');
  });
  then('the project exists without todos, and the Inbox todo is cancelled', () => {
    expect(sectionLines(projectFile('Herb spiral'), 'Tasks')).toEqual([]);
    expect(sectionLines(INBOX_FILE, 'Tasks')[0]).toMatch(/^- \[-\] Idea: Herb spiral #garden/);
  });
});

scenario('Someday / Maybe in the picker parks the todo: #someday, still in Inbox.txt, out of the Inbox list', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'daily.md#more-places-new-project-someday'}, () => {
  given('an Inbox with "Idea: Herb spiral #garden" and "Fix the gate"', herbs);
  when('I open the card of "Fix the gate", tap More… and Someday / Maybe', async () => {
    await openCardOf('Fix the gate');
    await tapLabel('More places');
    await tap('Someday / Maybe');
  });
  then('Inbox.txt still has it, with #someday, and the Inbox counts one', () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual(['- [ ] Idea: Herb spiral #garden', '- [ ] Fix the gate #someday']);
    expectShows('Inbox 1');
    expectNotShows('Fix the gate #someday');
  });
  when('I open the Review\'s Someday / Maybe step', async () => {
    await tapTab('Review');
    await tap('Someday / Maybe');
  });
  then('it lists the parked todo, under the Inbox', () => {
    expectShows('Inbox');
    expectShows(/^Fix the gate/);
  });
});

scenario('Review\'s Inbox to zero shows the same list and card, and filing works the same, past meetings included', {feature: 'Weekly Review', design: 'technical-design-calmer-screens.md', help: 'review.md#the-steps'}, () => {
  given('an Inbox with "Ask Lena #lena", "Order soil" and last week\'s meeting, and project Team offsite (#TO) using #lena', () => {
    offsite();
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Ask Lena #lena', '- [ ] Order soil'], Meetings: ['- 2026-11-02 10:00 Chat with Sam']}));
  });
  when('I open Review → Inbox to zero and tap "Ask Lena"', async () => {
    await openApp();
    await tapTab('Review');
    // The Review remembers its last step; the overview lists them all.
    if (shows('Overview')) await tap('Overview');
    await tap('Inbox to zero');
    await tap('Ask Lena #lena');
  });
  then('the list has the two todos and the past meeting, and the card offers #TO', () => {
    expectShows('Order soil');
    expectShows('Chat with Sam');
    expect(labelled('File to Team offsite')).not.toBeNull();
  });
  when('I tap #TO', () => tap('#TO'));
  then('the todo is in Team offsite, and "Order soil"\'s card is open', () => {
    expect(sectionLines(projectFile('Team offsite'), 'Tasks')).toEqual(['- [ ] Collect topics #lena', expect.stringMatching(/^- \[ \] Ask Lena #lena/)]);
    expectShows(/^Filed "Ask Lena #lena" to Team offsite/);
    expectShows('File to');
    expect(loggedErrors()).toEqual([]);
  });
});
