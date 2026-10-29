import {expectNotShows, expectShows, openApp, storedSettings, tap, tapTab, texts, type} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const DESIGN = 'technical-design-settings-tabs.md';
const TABS = ['Data', 'Contexts', 'Note setups', 'Features', 'Advanced', 'About'];

scenario('Settings opens on Data, with six tabs', {feature: 'Settings', design: DESIGN}, () => {
  given('Kept is open', () => openApp());
  when('I open Settings', () => tapTab('Settings'));
  then('the six tabs show, and Data holds the folders, the setup assistant and the profiles', () => {
    const all = texts();
    expect(TABS.every(t => all.includes(t))).toBe(true);
    expectNotShows('Folders ›');
    expectShows('Projects folder');
    expectShows('Run setup assistant');
    expectShows('Profiles');
  });
});

scenario('An unsaved folder field holds back the setup assistant until Save', {feature: 'Settings', design: DESIGN}, () => {
  given('Settings → Data is open', async () => {
    await openApp();
    await tapTab('Settings');
  });
  when('I change the Projects folder without saving', () => type('1 Projects', 'Work projects'));
  then('Run setup assistant waits and says why', async () => {
    expectShows('Save or reset the folder fields first.');
    await tap('Run setup assistant');
    expectNotShows('Setup · 1 of 4');
  });
  when('I tap Save under the folder fields', () => tap('Save'));
  then('the folder is stored and the assistant can start again', async () => {
    expect((await storedSettings()).projectsFolder).toBe('Work projects');
    expectNotShows('Save or reset the folder fields first.');
    await tap('Run setup assistant');
    expectShows('Setup · 1 of 4');
  });
});

scenario('The Gmail account sits on Features while Gmail is on, and stays stored while it is off', {feature: 'Settings', design: DESIGN}, () => {
  given('Gmail is set up for jordan@example.com and switched off', () => openApp({settings: {experimentalGmail: false, gmailEmail: 'jordan@example.com'}}));
  when('I open Settings → Features', async () => {
    await tapTab('Settings');
    await tap('Features');
  });
  then('there is no Gmail block', () => {
    expectNotShows('Gmail address');
    expectShows('Switch on Google Calendar or Gmail to set up its link or account here.');
  });
  when('I switch Gmail on', () => tap('Gmail: OFF (tap to turn on)'));
  then('its block shows the stored address', () => {
    expectShows('Gmail address');
    expect(texts()).not.toContain('Switch on Google Calendar or Gmail to set up its link or account here.');
  });
  and('the address is still stored', async () => {
    expect((await storedSettings()).gmailEmail).toBe('jordan@example.com');
  });
});

scenario('Debug logging and the debug bundle are on Advanced; About invites reports', {feature: 'Settings', design: DESIGN}, () => {
  given('Kept is open', () => openApp());
  when('I open Settings → Advanced', async () => {
    await tapTab('Settings');
    await tap('Advanced');
  });
  then('it shows Reporting a problem next to the tools', () => {
    expectShows('Reporting a problem');
    expectShows('Debug logging: OFF (tap to turn on)');
    expectShows('Export debug bundle');
    expectShows('Run Integrity Check');
  });
  when('I open About', () => tap('About'));
  then('it invites reports and points to Advanced, without the debug switches', () => {
    expectShows('Problems and ideas');
    expectShows(/Settings → Advanced → Reporting a problem/);
    expectNotShows('Export debug bundle');
  });
});

scenario('The profile chip in the tab bar opens the profiles on Data', {feature: 'Settings', design: DESIGN}, () => {
  given('the profile "work" is active', () => openApp({settings: {activeProfileId: 'work'}}));
  when('I tap the chip WORK in the tab bar', () => tap('WORK'));
  then('Settings shows Data with the profiles', () => {
    expectShows('Profiles');
    expectShows('Projects folder');
  });
});
