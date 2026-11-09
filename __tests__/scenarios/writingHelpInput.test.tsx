// docs/dev/history/technical-design-writing-help.md §6, scenario 19: a typo tag in the Integrity Check and Settings → Input.
import {expectNotShows, expectShows, openApp, runIntegrityCheck, tap, tapTab} from '../../test-helpers/scenario/app';
import {dataFile, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

scenario('A tag used once next to a known one is reported, listed and fixed on its line', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'settings.md#input'}, () => {
  given('#daily on two meetings, and "Retro #daiiy" once in project "Garden renovation"', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: [], Meetings: ['- 2026-10-01 09:00 Stand-up #daily', '- 2026-10-02 09:00 Stand-up #daily']}));
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Water the lawn'], Meetings: ['- 2026-10-03 10:00 Retro #daiiy']}));
  });
  let report = '';
  when('the Integrity Check runs', async () => {
    await openApp();
    report = await runIntegrityCheck();
  });
  then('the report lists #daiiy with → #daily', () => {
    expect(report).toContain('[tagTypo] project');
    expect(report).toContain('#daiiy is used once and looks like a typo: → #daily.');
  });
  when('I open Settings → Input', async () => {
    await tap('Input');
  });
  then('it lists #daiiy with its line and project', () => {
    expectShows('#daiiy');
    expectShows('Garden renovation · Retro #daiiy');
    expectShows('→ #daily');
  });
  when('I tap → #daily', async () => {
    await tap('→ #daily');
  });
  then('that line in the file reads #daily, the rest of the file is unchanged, and the list is empty', () => {
    expect(sectionLines(projectFile('Garden renovation'), 'Meetings')).toEqual(['- 2026-10-03 10:00 Retro #daily']);
    expect(sectionLines(projectFile('Garden renovation'), 'Tasks')).toEqual(['- [ ] Water the lawn']);
    expectNotShows('Garden renovation · Retro #daiiy');
  });
  when('I page the status line past the Integrity Check message', async () => {
    await tap('›');
  });
  then('it names the change', () => {
    expectShows('Changed #daiiy to #daily in Garden renovation');
  });
});

scenario('Keep takes a typo tag off the list without touching the file', {feature: 'Writing help', design: 'technical-design-writing-help.md', help: 'settings.md#input'}, () => {
  given('#daily twice and #daiiy once', () => {
    putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: ['- [ ] Plan #daily', '- [ ] Run #daily', '- [ ] Review #daiiy'], Meetings: []}));
  });
  when('I open Settings → Input and tap Keep', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Input');
    await tap('Keep');
  });
  then('the tag is off the list and the file is as it was', () => {
    expectNotShows('Website · Review #daiiy');
    expect(sectionLines(projectFile('Website'), 'Tasks')).toEqual(['- [ ] Plan #daily', '- [ ] Run #daily', '- [ ] Review #daiiy']);
  });
});
