import {readFileSync} from 'fs';
import {join} from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';
import {serializeProfile} from '../../src/domain/profiles';

const DESIGN = 'technical-design-clean-break.md';
const ROOT = join(__dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
const NATIVE = 'android/app/src/main/java/eu/embodyagile/gtdpara';
const S = '/storage/emulated/0';
const OLD_EXPORT = `${S}/EXPORT/gtdpara`;
const OLD_DEMO = `${S}/Note/gtdpara-demo`;
const profile = (name: string) => serializeProfile(name, {...DEFAULT_SETTINGS, inboxFolder: `${name} Inbox`}, new Date('2026-10-01T09:00:00Z'), '0.19.0');

scenario('The plugin identity is consistent', {feature: 'Settings', design: DESIGN}, () => {
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

scenario('A fresh install starts clean and writes only kept: keys', {feature: 'Settings', design: DESIGN}, () => {
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

scenario('Settings of gtdpara 0.24.0 are never read', {feature: 'Settings', design: DESIGN}, () => {
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

scenario("Remove Kept's data lists only Kept's own folders", {feature: 'Remove data', design: DESIGN}, () => {
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

scenario('Profiles in the old export folder are not copied', {feature: 'Profiles and demo space', design: DESIGN}, () => {
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
