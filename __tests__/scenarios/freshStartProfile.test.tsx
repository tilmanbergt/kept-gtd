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
