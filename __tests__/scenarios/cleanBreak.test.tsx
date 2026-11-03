import {readFileSync} from 'fs';
import {join} from 'path';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';

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
