// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 12-13: the Inbox on Daily (14, the context: contexts.test.tsx).
import {expectNotShows, expectShows, labelled, openApp, tap, tapTab, textsBetween} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
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
