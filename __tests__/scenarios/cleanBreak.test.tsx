import {readFileSync} from 'fs';
import {join} from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, storedSettings, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {fileText, putFile} from '../../test-helpers/scenario/files';
import {sparringSettings} from '../../test-helpers/scenario/setups';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';
import {profileSettingsOf, serializeProfile} from '../../src/domain/profiles';

const DESIGN = 'technical-design-clean-break.md';
const ROOT = join(__dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
const NATIVE = 'android/app/src/main/java/eu/embodyagile/gtdpara';
const S = '/storage/emulated/0';
const OLD_EXPORT = `${S}/EXPORT/gtdpara`;
const OLD_DEMO = `${S}/Note/gtdpara-demo`;
const profile = (name: string) => serializeProfile(name, {...DEFAULT_SETTINGS, inboxFolder: `${name} Inbox`}, new Date('2026-10-01T09:00:00Z'), '0.19.0');

scenario('The plugin identity is consistent', {feature: 'Settings', design: DESIGN, help: 'settings.md#about'}, () => {
  let config: {pluginID: string; pluginKey: string} = {pluginID: '', pluginKey: ''};
  given('the plugin as it is built', () => undefined);
  when('the host reads PluginConfig.json', () => {
    config = JSON.parse(read('PluginConfig.json'));
  });
  then('pluginKey, the app.json name and the MainActivity component name are all keptgtd', () => {
    expect(config.pluginKey).toBe('keptgtd');
    expect(JSON.parse(read('app.json')).name).toBe('keptgtd');
    expect(read(`${NATIVE}/MainActivity.kt`)).toContain('getMainComponentName(): String = "keptgtd"');
  });
  then('pluginID is nj7yssrvl7g778tz, the same as the fallback of the runtime guard', () => {
    expect(config.pluginID).toBe('nj7yssrvl7g778tz');
    expect(read(`${NATIVE}/PluginRuntimeGuard.kt`)).toContain('FALLBACK_PLUGIN_ID = "nj7yssrvl7g778tz"');
  });
});

scenario('A fresh install starts clean and writes only kept: keys', {feature: 'Settings', design: DESIGN, help: 'files-and-folders.md#what-kept-gtd-keeps-elsewhere'}, () => {
  given('an empty store', () => undefined);
  when('Kept starts', () => openApp({fresh: true}));
  then('the setup assistant opens', () => {
    expectShows('Setup · 1 of 5');
  });
  and('every key Kept wrote starts with kept:', async () => {
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain('kept:settings:v1');
    expect(keys.filter(k => !k.startsWith('kept:'))).toEqual([]);
  });
});

scenario('Settings of gtdpara 0.24.0 are never read', {feature: 'Settings', design: DESIGN, help: 'settings.md'}, () => {
  const old = JSON.stringify({...DEFAULT_SETTINGS, projectsFolder: 'My Projects', inboxFolder: 'My Inbox', setupAssistant: 'done', lastSeenVersion: '0.24.0'});
  given('the store holds gtdpara:settings:v1 with my own folders and no kept: key', async () => {
    await AsyncStorage.setItem('gtdpara:settings:v1', old);
  });
  when('Kept starts', () => openApp({fresh: true}));
  then('it behaves as a fresh install: the setup assistant opens', () => {
    expectShows('Setup · 1 of 5');
  });
  and('the gtdpara: key is still there, untouched, and the new settings have the default folders', async () => {
    expect(await AsyncStorage.getItem('gtdpara:settings:v1')).toBe(old);
    const stored = JSON.parse((await AsyncStorage.getItem('kept:settings:v1')) ?? '{}');
    expect(stored.projectsFolder).toBe(DEFAULT_SETTINGS.projectsFolder);
    expect(stored.inboxFolder).toBe(DEFAULT_SETTINGS.inboxFolder);
  });
});

scenario('Remove Kept\'s data lists only Kept\'s own folders', {feature: 'Remove data', design: DESIGN, help: 'settings.md#remove-kepts-data'}, () => {
  given('EXPORT/gtdpara and Note/gtdpara-demo hold files from gtdpara', () => {
    putFile(`${OLD_EXPORT}/profiles/work.json`, profile('Work'));
    putFile(`${OLD_DEMO}/Inbox.txt`, '# Inbox');
  });
  when("I open Settings → Data → Remove Kept's data… and remove with the defaults", async () => {
    await openApp();
    await tapTab('Settings');
    await tap("Remove Kept's data…");
    expect(texts().some(t => /gtdpara/i.test(t))).toBe(false);
    await tap('Remove…');
    await tap('Remove');
  });
  then('no row offered the old folders and both are still there', () => {
    expect(device().fs.exists(`${OLD_EXPORT}/profiles/work.json`)).toBe(true);
    expect(device().fs.exists(`${OLD_DEMO}/Inbox.txt`)).toBe(true);
  });
});

scenario('Profiles in the old export folder are not copied', {feature: 'Profiles and demo space', design: DESIGN, help: 'profiles-and-demo.md#profile-files'}, () => {
  given('EXPORT/gtdpara/profiles holds work.json and home.json, and EXPORT/kept-gtd holds no profile', () => {
    putFile(`${OLD_EXPORT}/profiles/work.json`, profile('Work'));
    putFile(`${OLD_EXPORT}/profiles/home.json`, profile('Home'));
  });
  when('Kept starts', () => openApp());
  then('nothing is copied into EXPORT/kept-gtd/profiles and no copy notice shows', () => {
    expect(device().fs.paths(`${S}/EXPORT/kept-gtd/profiles`)).toEqual([]);
    expectNotShows(/^Copied \d+ profiles? from/);
  });
});

/** A profile file as Kept GTD 0.24.0 wrote it: format gtdpara-profile, with the Tag Rules migration's keys. */
function profileOf024(): string {
  const settings = {
    ...profileSettingsOf({...DEFAULT_SETTINGS, ...sparringSettings()}),
    projectsFolder: 'Work Projects',
    contexts: [{id: 'c1', name: 'Coaching', shows: [{kind: 'tag', tag: 'sparring'}], hides: [], outsideMeetings: 'dim'}],
    experimentalGmail: true,
    noteSetupsMigrated: true,
    noteSetupsNotice: null,
    tagRules: [],
    nextTagRuleId: 1,
  };
  return JSON.stringify({format: 'gtdpara-profile', formatVersion: 1, name: 'Work', savedAt: '2026-10-30T09:00:00.000Z', savedBy: '0.24.0', settings}, null, 2) + '\n';
}

const LEFTOVER_KEYS = ['noteSetupsMigrated', 'noteSetupsNotice', 'tagRules', 'nextTagRuleId'];
const WORK_PROFILE = `${S}/EXPORT/kept-gtd/profiles/work.json`;

scenario('A profile saved by 0.24.0 loads, without the keys of removed settings', {feature: 'Profiles and demo space', design: DESIGN, help: 'profiles-and-demo.md#profile-files'}, () => {
  given('EXPORT/kept-gtd/profiles/work.json was written by 0.24.0, with noteSetupsMigrated, noteSetupsNotice, tagRules and the experimental switches', () => {
    putFile(WORK_PROFILE, profileOf024());
  });
  when('I switch to "Work" in Settings → Data', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Data');
    await tap('Switch');
    await tap('Switch');
  });
  then('its folders, Note setups, contexts and switches apply, and none of the leftover keys is in the settings', async () => {
    const s = await storedSettings();
    expect(s.projectsFolder).toBe('Work Projects');
    expect(s.noteSetups.map(x => x.name)).toEqual(sparringSettings().noteSetups!.map(x => x.name));
    expect(s.contexts.map(c => c.name)).toEqual(['Coaching']);
    expect(s.experimentalGmail).toBe(true);
    expect(s.activeProfileId).toBe('work');
    for (const key of LEFTOVER_KEYS) expect(key in s).toBe(false);
  });
  when('I save the profile in Settings → Data', async () => {
    await tapTab('Settings');
    await tap('Data');
    await tap('Save', 1);
    expectShows('Saved to EXPORT/kept-gtd/profiles/work.json');
  });
  then('work.json is written in the same format, without the leftover keys', () => {
    const file = JSON.parse(fileText(WORK_PROFILE));
    expect(file.format).toBe('gtdpara-profile');
    expect(file.settings.projectsFolder).toBe('Work Projects');
    for (const key of LEFTOVER_KEYS) expect(key in file.settings).toBe(false);
  });
});

scenario('Note setups show no migration notice', {feature: 'Note setups', design: DESIGN, help: 'note-setups.md'}, () => {
  given('a fresh install without Note setups', () => undefined);
  when('I open Settings → Note setups', async () => {
    await openApp({fresh: true});
    await tapTab('Settings');
    await tap('Skip');
    await tap('Note setups');
  });
  then('no migration notice shows, and the Default is offered with its pages', () => {
    expectNotShows(/Tag Rules/);
    expectShows('+ New note setup');
    expectShows('Default');
  });
});
