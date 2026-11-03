import {readFileSync} from 'fs';
import {join} from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {expectShows, openApp} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';

const DESIGN = 'technical-design-clean-break.md';
const ROOT = join(__dirname, '..', '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
const NATIVE = 'android/app/src/main/java/eu/embodyagile/gtdpara';

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
