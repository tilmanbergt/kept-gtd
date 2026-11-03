import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, readTexts, storedSettings, tap, tapTab} from '../../test-helpers/scenario/app';
import {fileText, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {ContextDef} from '../../src/domain/contexts';
import {createNoteSetup} from '../../src/domain/noteSetups';
import {serializeProfile} from '../../src/domain/profiles';
import {DEFAULT_SETTINGS, GtdParaSettings} from '../../src/domain/settings';

const DESIGN = 'technical-design-fresh-start-profile.md';
const S = '/storage/emulated/0';
const PROFILES = `${S}/EXPORT/kept-gtd/profiles`;
const PRODUCTION = `${PROFILES}/production.json`;
const context = (id: string, name: string): ContextDef => ({id, name, shows: [], hides: [], outsideMeetings: 'dim'});
const SAVED: Partial<GtdParaSettings> = {
  contexts: [context('work', 'Work'), context('home', 'Home')],
  noteSetups: [{...createNoteSetup('1', 'thread'), name: '1:1 meetings', tags: ['1on1']}],
  nextNoteSetupId: 2,
  setupAssistant: 'done',
};
const savedProfile = (name: string, savedAt: string): string =>
  serializeProfile(name, {...DEFAULT_SETTINGS, ...SAVED}, new Date(savedAt), '0.24.0');

async function expectSavedSetupActive(): Promise<void> {
  const s = await storedSettings();
  expect(s.contexts.map(c => c.name)).toEqual(['Work', 'Home']);
  expect(s.noteSetups.map(n => n.name)).toEqual(['1:1 meetings']);
  expect(s.freshStart).toBe(false);
}

async function startFreshAndFinish(): Promise<void> {
  await tap('Start fresh');
  expectShows('Setup · 1 of 5');
  for (let i = 0; i < 5; i++) await tap('Next ›');
  await tap('Finish');
}

scenario('Welcome back loads the saved profile after a fresh install', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  let before = '';
  given('a fresh install and production.json with two contexts and one Note setup', () => {
    before = savedProfile('Production', '2026-11-01T09:00:00Z');
    putFile(PRODUCTION, before);
  });
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('the assistant shows Welcome back with Production selected', () => {
    expectShows('Welcome back');
    expectShows(/^Kept found settings you saved earlier\./);
    expectShows('● Production');
    expectShows('Load "Production"');
    expectNotShows('Setup · 1 of 5');
  });
  when('I tap Load "Production"', () => tap('Load "Production"'));
  then('the contexts and the Note setup are active, the assistant is closed and the status names the profile', async () => {
    await expectSavedSetupActive();
    expect((await storedSettings()).setupAssistant).toBe('done');
    expectNotShows('Welcome back');
    expectShows(/^Loaded your profile "Production"\. If you use Gmail or Google Calendar/);
  });
  and('production.json is byte-identical', () => {
    expect(fileText(PRODUCTION)).toBe(before);
  });
});

scenario('Welcome back lists the newest profile first and selects it', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  given('production.json saved 1 Nov and work.json saved 3 Nov', () => {
    putFile(PRODUCTION, savedProfile('Production', '2026-11-01T09:00:00Z'));
    putFile(`${PROFILES}/work.json`, savedProfile('Work', '2026-11-03T09:00:00Z'));
  });
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('Work is listed first and selected', () => {
    const rows = readTexts().filter(t => /^[●○] /.test(t));
    expect(rows).toEqual(['● Work', '○ Production']);
    expectShows('Load "Work"');
  });
  when('I pick Production', () => tap('○ Production'));
  then('the Load button names it', () => {
    expectShows('Load "Production"');
  });
});

scenario('Start fresh, then Restore from Settings → Data → Profiles', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  let before = '';
  given('a fresh install and a saved production.json', () => {
    before = savedProfile('Production', '2026-11-01T09:00:00Z');
    putFile(PRODUCTION, before);
  });
  when('I tap Start fresh and finish the assistant', async () => {
    await openApp({fresh: true});
    await startFreshAndFinish();
  });
  then('production.json is unchanged and the fresh mark stays', async () => {
    expect(fileText(PRODUCTION)).toBe(before);
    expect((await storedSettings()).freshStart).toBe(true);
  });
  when('I open Settings → Data and tap Restore on Production', async () => {
    await tapTab('Settings');
    await tap('Restore');
  });
  then('the confirm says the file stays as it is', () => {
    expectShows('Load your saved profile "Production"? The fresh settings are replaced; the file stays as it is.');
  });
  when('I confirm with Restore', () => tap('Restore'));
  then('the contexts and the Note setup are active, and the file is unchanged', async () => {
    await expectSavedSetupActive();
    expect(fileText(PRODUCTION)).toBe(before);
  });
});

scenario('Switching away from fresh settings does not overwrite the saved profile', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  let before = '';
  given('a fresh start with a saved production.json (Start fresh)', async () => {
    before = savedProfile('Production', '2026-11-01T09:00:00Z');
    putFile(PRODUCTION, before);
    await openApp({fresh: true});
    await startFreshAndFinish();
  });
  when('I create the demo space and switch to Demo', async () => {
    await tapTab('Settings');
    await tap('Create demo space');
    await tap('Switch');
  });
  then('the confirm says the saved profile stays as it is', () => {
    expectShows('Switch to "Demo"? Your saved profile "Production" stays as it is.');
  });
  when('I confirm with Switch', () => tap('Switch'));
  then('Demo is active and production.json is unchanged', async () => {
    expect((await storedSettings()).activeProfileId).toBe('demo');
    expect(fileText(PRODUCTION)).toBe(before);
  });
});

scenario('Save on fresh settings asks before replacing the saved profile', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  let before = '';
  given('a fresh start with a saved production.json (Start fresh)', async () => {
    before = savedProfile('Production', '2026-11-01T09:00:00Z');
    putFile(PRODUCTION, before);
    await openApp({fresh: true});
    await startFreshAndFinish();
  });
  when('I tap Save on Production', async () => {
    await tapTab('Settings');
    expectShows('Restore');
    await tap('Save', 1);
  });
  then('a confirm asks first', () => {
    expectShows('Replace your saved profile "Production" with the current fresh settings?');
  });
  when('I cancel with ✕ on the confirm', () => tap('✕', 1));
  then('the confirm is gone and the file is unchanged', () => {
    expectNotShows('Replace your saved profile "Production" with the current fresh settings?');
    expect(fileText(PRODUCTION)).toBe(before);
  });
  when('I tap Save again and confirm with Save', async () => {
    await tap('Save', 1);
    await tap('Save');
  });
  then('the file holds the fresh settings and the fresh mark is cleared', async () => {
    expect(fileText(PRODUCTION)).not.toBe(before);
    expect(JSON.parse(fileText(PRODUCTION)).settings.contexts).toEqual([]);
    expect((await storedSettings()).freshStart).toBe(false);
  });
});

scenario("Remove Kept's data on fresh settings does not save over the saved profile unasked", {feature: 'Profiles and demo space', design: DESIGN}, () => {
  let before = '';
  given('a fresh start with a saved production.json (Start fresh)', async () => {
    before = savedProfile('Production', '2026-11-01T09:00:00Z');
    putFile(PRODUCTION, before);
    await openApp({fresh: true});
    await startFreshAndFinish();
  });
  when("I open Settings → Data → Remove Kept's data…", async () => {
    await tapTab('Settings');
    await tap("Remove Kept's data…");
  });
  then('Save the active profile first is unchecked', () => {
    expectShows('☐ Save the active profile first');
  });
  when('I remove with the defaults', async () => {
    await tap('Remove…');
    await tap('Remove');
  });
  then('production.json is unchanged', () => {
    expect(fileText(PRODUCTION)).toBe(before);
  });
});

scenario('Without saved profiles the assistant starts at Folders and creates no profiles folder', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  given('a fresh install without EXPORT/kept-gtd/profiles', () => undefined);
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('the assistant starts at Folders as before', () => {
    expectShows('Setup · 1 of 5');
    expectNotShows('Welcome back');
  });
  and('the profiles folder was not created', () => {
    expect(device().fs.exists(PROFILES)).toBe(false);
  });
});

scenario('An unreadable profile file shows no Welcome back', {feature: 'Profiles and demo space', design: DESIGN}, () => {
  given('a fresh install and a production.json that is not valid JSON', () => {
    putFile(PRODUCTION, '{"name": "Production", ');
  });
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('the assistant starts at Folders', () => {
    expectShows('Setup · 1 of 5');
    expectNotShows('Welcome back');
  });
});

scenario("After Remove Kept's data, Welcome back offers the saved profile", {feature: 'Profiles and demo space', design: DESIGN}, () => {
  given('Kept runs on stored settings with two contexts', async () => {
    await openApp({settings: SAVED});
  });
  when("I remove Kept's data with the defaults (profile saved first) and tap Start fresh", async () => {
    await tapTab('Settings');
    await tap("Remove Kept's data…");
    await tap('Remove…');
    await tap('Remove');
    await tap('Start fresh');
  });
  then('Welcome back offers Production', () => {
    expectShows('Welcome back');
    expectShows('Load "Production"');
  });
  when('I tap Load "Production"', () => tap('Load "Production"'));
  then('the contexts and the Note setup are back', expectSavedSetupActive);
});
