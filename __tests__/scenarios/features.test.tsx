import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, tap, tapTab, textsBetween} from '../../test-helpers/scenario/app';
import {fileText, dataFile, PATHS, projectFile, putFile, loggedErrors} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

// Settings → Features (docs/dev/history/technical-design-daily-slim.md §5 T10-T12, without the focus-mode switch:
// docs/dev/history/technical-design-time-and-place.md §3.6).
const DESIGN = 'technical-design-daily-slim.md';
const year = String(new Date().getFullYear());

function doneWebsite(): void {
  putFile(projectFile('Website'), dataFile('project', {Scope: [], Tasks: ['- [x] Write copy'], Meetings: []}, ['status: done', `doneAt: ${year}-10-01`, 'abbrev: WEB']));
}

scenario('Close-out off: a Done project archives directly from its page', {feature: 'Settings', design: DESIGN}, () => {
  given('Project close-out is switched off and project "Website" is Done', doneWebsite);
  when('I open Website on Current', async () => {
    await openApp({settings: {modules: {closeOut: false}}});
    await tapTab('Projects');
    await tap(/^Website/);
  });
  then('its status panel offers Archive, not Close out', () => {
    expectShows('🗄 Archive…');
    expectNotShows('🗄 Close out…');
  });
  when('I archive it and confirm', async () => {
    await tap('🗄 Archive…');
    await tap('Move to Archive');
  });
  then('the folder is in the Archive and no close-out wizard opened', () => {
    expect(device().fs.exists(`${PATHS.archive}/${year}/Website/project.txt`)).toBe(true);
    expect(fileText(`${PATHS.archive}/${year}/Website/project.txt`)).not.toMatch(/## Close-out/);
    expectNotShows('Readiness · all clear');
    expect(loggedErrors()).toEqual([]);
  });
});

scenario('Close-out off: Review\'s Done step archives directly', {feature: 'Settings', design: DESIGN}, () => {
  given('Project close-out is switched off and project "Website" is Done', doneWebsite);
  when('I open Review → Done awaiting review and pick Website', async () => {
    await openApp({settings: {modules: {closeOut: false}}});
    await tapTab('Review');
    await tap(/^Done awaiting review/);
    await tap(/^Website/);
  });
  then('it offers Archive, not Close out… or Quick archive…', () => {
    expectShows('Archive');
    expectNotShows('Close out…');
    expectNotShows('Quick archive…');
  });
  when('I archive it and confirm', async () => {
    await tap('Archive');
    await tap('Move to Archive');
  });
  then('the folder is in the Archive', () => {
    expect(device().fs.exists(`${PATHS.archive}/${year}/Website/project.txt`)).toBe(true);
  });
});

scenario('Settings → Features shows the Experimental switches that moved from Advanced', {feature: 'Settings', design: DESIGN}, () => {
  given('Google Calendar was switched on before and project "Website" is Done', doneWebsite);
  when('I open Settings → Features', async () => {
    await openApp({settings: {experimentalGoogleCalendar: true}});
    await tapTab('Settings');
    await tap('Features');
  });
  then('Project close-out is on and Google Calendar is on under Experimental', () => {
    expectShows('Project close-out: ON (tap to turn off)');
    expect(textsBetween('Experimental')).toContain('Google Calendar: ON (tap to turn off)');
  });
  when('I open Advanced', () => tap('Advanced'));
  then('it no longer shows the Experimental switches', () => {
    expectNotShows('Google Calendar: ON (tap to turn off)');
    expectNotShows('Experimental');
  });
  when('I switch Project close-out off on Features', async () => {
    await tap('Features');
    await tap('Project close-out: ON (tap to turn off)');
  });
  and('open the Done project Website', async () => {
    await tapTab('Projects');
    await tap(/^Website/);
  });
  then('its page offers Archive at once', () => expectShows('🗄 Archive…'));
});
