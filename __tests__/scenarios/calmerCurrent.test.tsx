// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 26-28 (stage C): ⚙ Settings of a
// Project or Area, "Show on this page" and the `show:` frontmatter line.
import {expectNotShows, expectShows, labelled, openApp, openItemSettings, tap, tapLabel, tapTab} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, fileText, loggedErrors, projectFile, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

function garden(extra: string[] = []): void {
  putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next'], Meetings: []}, ['abbrev: GR', ...extra]));
}

async function openGarden(): Promise<void> {
  await openApp();
  await tapTab('Projects');
  await tap(/^Garden renovation/);
}

scenario('⚙ Settings hold status, area, abbreviation and scope; the page keeps only working', {feature: 'Projects and Areas', design: 'technical-design-calmer-screens.md', help: 'projects-and-areas.md#settings'}, () => {
  given('project "Garden renovation" (#GR) and area "Home"', () => {
    garden();
    putFile(areaFile('Home'), dataFile('area', {Scope: [], Tasks: [], Meetings: []}, ['abbrev: HOME']));
  });
  when('I open its page', openGarden);
  then('the page shows the abbreviation read only, and no status, scope or area controls', () => {
    expectShows('#GR');
    expectShows('⚙ Settings');
    expectNotShows('On Hold');
    expectNotShows('Assign to Area…');
    expectNotShows('+ Add a scope');
  });
  when('I open ⚙ Settings', openItemSettings);
  then('it shows the name, abbreviation, scope, status, Close out, Assign to Area and Show on this page', () => {
    for (const text of ['Name', 'Garden renovation', 'Abbreviation', '#GR', 'Scope', '+ Add a scope', 'Status', 'On Hold', '🗄 Close out…', 'Assign to Area…', 'Show on this page', 'Left side opens on']) expectShows(text);
  });
  when('I tap Assign to Area… and pick Home in the Files pane', async () => {
    await tap('Assign to Area…');
    await tap(/Home ›$/);
  });
  then('the project file names the area and ⚙ shows it', () => {
    expect(fileText(projectFile('Garden renovation'))).toMatch(/^area: Home$/m);
    expectShows('Area: Home');
    expectShows('Show on this page');
  });
  when('I tap Close', () => tap('Close'));
  then('the page is back, with its todos', () => {
    expectShows('Order soil');
    expectNotShows('Show on this page');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('Show on this page writes the show: line at once, and removes it when all is Auto again', {feature: 'Projects and Areas', design: 'technical-design-calmer-screens.md', help: 'projects-and-areas.md#show-on-this-page, files-and-folders.md#inside-projecttxt'}, () => {
  given('project "Garden renovation" without a show: line', () => garden());
  when('I open ⚙ Settings and set Loops to Always', async () => {
    await openGarden();
    await openItemSettings();
    await tapLabel('Loops Always');
  });
  then('the project file has show: loops=always and Always is selected', () => {
    expect(fileText(projectFile('Garden renovation'))).toMatch(/^show: loops=always$/m);
    expect(labelled('Loops Always')?.on).toBe(true);
  });
  when('I set the left side to open on Files', () => tapLabel('Opens on Files'));
  then('the line carries both', () => expect(fileText(projectFile('Garden renovation'))).toMatch(/^show: loops=always open=files$/m));
  when('I set Loops back to Auto and the left side back to First with content', async () => {
    await tapLabel('Loops Auto');
    await tapLabel('Opens on First with content');
  });
  then('the show: line is gone from the file', () => {
    expect(fileText(projectFile('Garden renovation'))).not.toMatch(/^show:/m);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('A show: line written by hand is kept as written; a hidden part with content says so', {feature: 'Projects and Areas', design: 'technical-design-calmer-screens.md', help: 'files-and-folders.md#inside-projecttxt, projects-and-areas.md#show-on-this-page'}, () => {
  given('a project file with "show: loops=nevr foo=bar threads=never" and one thread', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Threads: ['- lena: active'], Tasks: ['- [ ] Order soil #next'], Meetings: []}, ['abbrev: GR', 'show: loops=nevr foo=bar threads=never']));
  });
  when('I open ⚙ Settings', async () => {
    await openGarden();
    await openItemSettings();
  });
  then('the typo reads as Auto, and Threads says what Never hides', () => {
    expect(labelled('Loops Auto')?.on).toBe(true);
    expect(labelled('Threads Never')?.on).toBe(true);
    expectShows('Never · 1 thread');
  });
  when('I set the status to On Hold', () => tap('On Hold'));
  then('the status changed and the show: line is kept as written', () => {
    const text = fileText(projectFile('Garden renovation'));
    expect(text).toMatch(/^status: on-hold$/m);
    expect(text).toMatch(/^show: loops=nevr foo=bar threads=never$/m);
  });
  and('the frontmatter is still one block', () => expect(fileText(projectFile('Garden renovation')).split('\n').filter(l => l === '---')).toHaveLength(2));
});
