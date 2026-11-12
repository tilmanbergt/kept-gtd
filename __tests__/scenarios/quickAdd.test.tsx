import {expectNotShows, expectShows, fieldValue, firstCheckboxOf, focus, openApp, openInbox, tap, tapLabel, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, expectFileContains, INBOX_FILE, loggedErrors, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

scenario('Quick Add a todo in a project', {feature: 'Quick Add', design: 'technical-design-filing-unification.md', help: 'quick-add.md#adding-a-todo'}, () => {
  given('project "Website" has the todo "Write copy" and a hand-written Scope', () => {
    putFile(
      projectFile('Website'),
      dataFile('project', {Scope: ['Relaunch the site.', 'A second paragraph, by hand.'], Tasks: ['- [ ] Write copy #next'], Meetings: []}),
    );
  });
  when('I open Kept GTD, go to Projects, open "Website" and add the todo "Call the designer"', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await type('New todo', 'Call the designer');
    await tap('+ Add');
  });
  then('project.txt lists both todos', () => {
    const tasks = sectionLines(projectFile('Website'), 'Tasks');
    expect(tasks[0]).toBe('- [ ] Write copy #next');
    expect(tasks[1]).toMatch(/^- \[ \] Call the designer/);
    expect(tasks).toHaveLength(2);
  });
  then('the Scope and the rest of the file are unchanged', () => {
    expectFileContains(projectFile('Website'), '## Scope\nRelaunch the site.\nA second paragraph, by hand.\n');
    expectFileContains(projectFile('Website'), '## Meetings');
  });
  then('the status line confirms it and nothing was logged as an error', () => {
    expectShows(/Added todo "Call the designer"/);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('Edit a todo, then tap another one: the first edit is saved', {feature: 'Quick Add', design: 'technical-design-meeting-lists.md', help: 'quick-add.md#editing'}, () => {
  given('project "Website" has the todos "Write copy" and "Fix footer"', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: ['- [ ] Write copy #next', '- [ ] Fix footer #next'], Meetings: []}));
  });
  when('I open "Website", tap "Write copy" and Edit on its card, change it to "Write landing page copy" and tap "Fix footer"', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await tap('Write copy');
    await tap('Edit');
    await type('New todo', 'Write landing page copy');
    await tap('Fix footer');
  });
  then('project.txt has the changed todo, still #next, and "Fix footer" unchanged', () => {
    expect(sectionLines(projectFile('Website'), 'Tasks')).toEqual(['- [ ] Write landing page copy #next', '- [ ] Fix footer #next']);
  });
  then('"Fix footer" is now the selected one, shown as its card (technical-design-item-card.md §3)', () => {
    expectShows(/^Todo · .+ · next$/);
    expectShows('More ›');
  });
});

scenario('An abbreviation tag files a todo into its project while editing', {feature: 'Quick Add', design: 'technical-design-abbrev-quick-file.md', help: 'quick-add.md#filing-directly-with-an-abbreviation'}, () => {
  given('project "Website" (#WEB) and the Inbox todo "Ask about hosting"', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: WEB']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: ['- [ ] Ask about hosting'], Meetings: []}));
  });
  when('I edit the Inbox todo, add "#WEB" and tap "Save to Website"', async () => {
    await openApp();
    await openInbox();
    await tap('Ask about hosting');
    await tap('Edit');
    await type('New todo', 'Ask about hosting #WEB');
    await tap(/^Save to Website/);
  });
  then('the todo is in Website\'s project.txt, without the #WEB tag', () => {
    expect(sectionLines(projectFile('Website'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Ask about hosting$|^- \[ \] Ask about hosting \[/)]);
  });
  then('Inbox.txt no longer has it', () => {
    expect(sectionLines(INBOX_FILE, 'Tasks')).toEqual([]);
  });
});

scenario('Ticking a todo off writes its completion date', {feature: 'Quick Add', design: 'technical-design-tags.md', help: 'tags.md#dates-kept-gtd-records'}, () => {
  given('project "Website" has the todo "Write copy"', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: ['- [ ] Write copy #next'], Meetings: []}));
  });
  when('I open "Website" and tick "Write copy" off', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await tap('☐', firstCheckboxOf('Write copy'));
  });
  then('project.txt has it done, with today\'s date as completion field', () => {
    expect(sectionLines(projectFile('Website'), 'Tasks')).toEqual([expect.stringMatching(/^- \[x\] Write copy #next .*\[completion:: \d{4}-\d{2}-\d{2}\]$/)]);
  });
});

scenario('The ✕ puts a hovering strip away until the field gains focus again', {feature: 'Quick Add', design: 'technical-design-item-card.md', help: 'quick-add.md#adding-a-todo'}, () => {
  given('project "Website"', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}));
  });
  when('I open "Website" and put the cursor into the todo field', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Website/);
    await focus('New todo');
  });
  then('the strip hovers above the box with its suggestions', () => {
    expectShows('#next');
  });
  when('I tap its ✕', async () => {
    await tapLabel('Hide');
  });
  then('it is gone while the field still has the cursor', () => {
    expectNotShows('#next');
  });
  when('the field loses the cursor and gets it back', async () => {
    await focus('New todo', false);
    await focus('New todo');
  });
  then('the strip is back', () => {
    expectShows('#next');
  });
  when('I hide it again and open a meeting', async () => {
    await tapLabel('Hide');
    await tap('Meeting');
  });
  then('the meeting form shows', () => {
    expect(fieldValue('New meeting')).toBe('');
  });
  when('I open the due date and put the cursor into it', async () => {
    await tap('Todo');
    await tap('📅');
    await focus('Due YYYY-MM-DD');
  });
  then('the date strip hovers there with its own ✕, which puts it away', async () => {
    expectShows('+7');
    await tapLabel('Hide');
    expectNotShows('+7');
  });
});
