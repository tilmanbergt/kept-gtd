// docs/dev/history/technical-design-calmer-screens.md §6 scenario 4, §3.1: a tap on a row shows its card
// without re-rendering the list (render counts per component, test-helpers/renderCounts.ts).
jest.mock('../../src/utils/perf', () => require('../../test-helpers/renderCounts').perfWithRenderCounts());

import {expectShows, labelled, openApp, settle, tap, tapTab} from '../../test-helpers/scenario/app';
import {dataFile, INBOX_FILE, loggedErrors, projectFile, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {renderCounts, resetRenderCounts} from '../../test-helpers/renderCounts';

let renders: Record<string, number> = {};

scenario('A tap on a Daily todo shows its card without re-rendering the list', {feature: 'Daily', design: 'technical-design-calmer-screens.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('project "Garden renovation" with three #next todos', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next', '- [ ] Buy seeds #next', '- [ ] Call Marco #next'], Meetings: []}, ['abbrev: GR']));
    putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
  });
  when('I open Daily and tap the todo "Buy seeds"', async () => {
    await openApp();
    await tapTab('Daily');
    await settle(10);
    resetRenderCounts();
    await tap(/^Buy seeds/);
    await settle(10);
    renders = renderCounts();
  });
  then('its card shows in Quick Add\'s place', () => {
    expectShows(/^Buy seeds/);
    expect(labelled('Close')).not.toBeNull();
  });
  and('neither the screen, the todos list nor Quick Add\'s hidden rows rendered again; only the rows whose mark changed did', () => {
    expect(renders.DailyView ?? 0).toBe(0);
    expect(renders.DailyTodosColumn ?? 0).toBe(0);
    expect(renders.TaskRow ?? 0).toBeLessThanOrEqual(1);
    expect(renders.SelectionZone ?? 0).toBeGreaterThan(0);
    // Quick Add's hidden rows behind the card don't render again either.
    for (const rows of ['QuickAddRows:task', 'QuickAddRows:meeting', 'QuickAddRows:note', 'QuickAddRows:agreement']) expect([rows, renders[rows] ?? 0]).toEqual([rows, 0]);
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('A tap on a todo on the Current page shows its card without re-rendering the lists', {feature: 'Projects and Areas', design: 'technical-design-calmer-screens.md', help: 'quick-add.md#the-card-one-tap-selects'}, () => {
  given('project "Garden renovation" with three todos and a meeting', () => {
    putFile(projectFile('Garden renovation'), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil #next', '- [ ] Buy seeds #next', '- [ ] Call Marco'], Meetings: ['- 2026-12-01 10:00 Site visit']}, ['abbrev: GR']));
  });
  when('I open the project and tap the todo "Buy seeds"', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(/^Garden renovation/);
    await settle(10);
    resetRenderCounts();
    await tap(/^Buy seeds/);
    await settle(10);
    renders = renderCounts();
  });
  then('its card shows, and neither the Todos nor the Meetings list rendered again', () => {
    expect(labelled('Close')).not.toBeNull();
    expect(renders.TodosSection ?? 0).toBe(0);
    expect(renders.MeetingsSection ?? 0).toBe(0);
    for (const rows of ['QuickAddRows:task', 'QuickAddRows:meeting', 'QuickAddRows:note', 'QuickAddRows:agreement']) expect([rows, renders[rows] ?? 0]).toEqual([rows, 0]);
    expect(renders.TaskRow ?? 0).toBeLessThanOrEqual(1);
    expect(loggedErrors()).toEqual([]);
  });
});
