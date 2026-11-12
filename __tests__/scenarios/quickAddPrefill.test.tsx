// docs/dev/history/technical-design-quickadd-redesign.md §6 scenarios 16 and 17 (F3, the draft part):
// only Daily starts the next draft with the abbreviation tag just used.
import {fieldValue, openApp, tap, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const FIELD = 'New todo';

function twoProjects(): void {
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: GR']));
  putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: WEB']));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
}

scenario('On Daily the next todo starts with the abbreviation tag just used', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#filing-directly-with-an-abbreviation'}, () => {
  given('projects "Garden renovation" (#GR) and "Website" (#WEB)', twoProjects);
  when('on Daily I add "Order soil #GR" and open + Todo again', async () => {
    await openApp();
    await tapTab('Daily');
    await type(FIELD, 'Order soil #GR');
    await tap(/^\+ Add to Garden/);
    await tap('+ Todo');
  });
  then('the todo is in Garden renovation and the new draft reads "#GR "', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Order soil/)]);
    expect(fieldValue(FIELD)).toBe('#GR ');
  });
});

scenario('On a project\'s page the next todo starts empty after an add to another place', {feature: 'Quick Add', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#filing-directly-with-an-abbreviation'}, () => {
  given('projects "Garden renovation" (#GR) and "Website" (#WEB)', twoProjects);
  when('on Garden renovation\'s page I add "Call the designer #WEB" and open + Todo again', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await type(FIELD, 'Call the designer #WEB');
    await tap(/^\+ Add to Website/);
    await tap('+ Todo');
  });
  then('the todo is in Website and the new draft is empty', () => {
    expect(sectionLines(projectFile('Website'), 'Tasks')).toEqual([expect.stringMatching(/^- \[ \] Call the designer/)]);
    expect(fieldValue(FIELD)).toBe('');
  });
});
