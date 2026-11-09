// docs/dev/history/technical-design-clean-break.md §3: the plugin's identity to the host is
// keptgtd / nj7yssrvl7g778tz and its stored keys start with kept: (§4). What is invisible to the user and already written into notes and
// files keeps the name gtdpara: changing a note marker, the profile format or the temp suffix would
// break notes and saved profiles, so this test fails when one changes.
import {readFileSync} from 'fs';
import {join} from 'path';
import {MARK_USERDATA_PREFIX, markDoneUserData, markUserData, parseMarkUserData} from '../src/domain/marks';
import {
  MEETING_NOTE_BLOCK_USERDATA,
  NOTE_HEADING_USERDATA,
  NOTE_LINK_USERDATA,
  notePieceUserData,
} from '../src/domain/meetingNoteBlock';
import {PROFILE_FILE_FORMAT} from '../src/domain/profiles';
import {writeTempPathFor} from '../src/domain/fileName';
import {
  CAPTURE_DESTINATIONS_KEY,
  GOOGLE_CALENDAR_CACHE_KEY,
  SECRETS_KEY,
  SETTINGS_KEY,
  STORE_PREFIX,
  TAG_FIXES_KEY,
  TAG_USAGE_KEY,
  UPDATE_STATE_KEY,
} from '../src/domain/storeKeys';

const ROOT = join(__dirname, '..');
const NATIVE = 'android/app/src/main/java/eu/embodyagile/gtdpara';
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
const json = (path: string): Record<string, unknown> => JSON.parse(read(path));

describe('plugin identity', () => {
  it('has the Kept GTD pluginID and pluginKey', () => {
    expect(json('PluginConfig.json').pluginID).toBe('nj7yssrvl7g778tz');
    expect(json('PluginConfig.json').pluginKey).toBe('keptgtd');
    expect(json('PluginConfig.json').name).toBe('Kept GTD');
  });

  it('registers the app under pluginKey: app.json name = MainActivity component name = pluginKey', () => {
    const key = json('PluginConfig.json').pluginKey;
    expect(json('app.json').name).toBe(key);
    expect(read('index.js')).toContain("import {name as appName} from './app.json'");
    expect(read(`${NATIVE}/MainActivity.kt`)).toContain(`getMainComponentName(): String = "${key}"`);
  });

  it('falls back to the pluginID of PluginConfig.json in the runtime guard', () => {
    expect(read(`${NATIVE}/PluginRuntimeGuard.kt`)).toContain(`FALLBACK_PLUGIN_ID = "${json('PluginConfig.json').pluginID}"`);
  });

  it('names the package kept-gtd in package.json and the lockfile', () => {
    expect(json('package.json').name).toBe('kept-gtd');
    const lock = json('package-lock.json') as {name: string; packages: Record<string, {name?: string}>};
    expect(lock.name).toBe('kept-gtd');
    expect(lock.packages[''].name).toBe('kept-gtd');
  });

  it('keeps the Android package', () => {
    expect(read('android/app/build.gradle')).toContain('applicationId "eu.embodyagile.gtdpara"');
  });

  it('keeps the native module names', () => {
    expect(read('src/supernote/fileSystem.ts')).toContain('GtdParaFile');
    expect(read('src/supernote/pdfNative.ts')).toContain('GtdParaPdf');
    expect(read('src/supernote/pluginRuntime.ts')).toContain('GtdParaRuntime');
  });
});

describe('storage keys', () => {
  it('puts every key under the kept: prefix', () => {
    expect(STORE_PREFIX).toBe('kept:');
    expect([SETTINGS_KEY, SECRETS_KEY, CAPTURE_DESTINATIONS_KEY, TAG_USAGE_KEY, TAG_FIXES_KEY, GOOGLE_CALENDAR_CACHE_KEY, UPDATE_STATE_KEY]).toEqual([
      'kept:settings:v1',
      'kept:profileSecrets:v1',
      'kept:captureDestinations:v1',
      'kept:tagUsage:v1',
      'kept:tagFixes:v1',
      'kept:googleCalendarCache:v1',
      'kept:updates:v1',
    ]);
  });

  it.each([
    'src/storage/settingsStorage.ts',
    'src/storage/profiles.ts',
    'src/storage/destinationUsage.ts',
    'src/storage/tagUsage.ts',
    'src/storage/learnedTagFixes.ts',
    'src/storage/googleCalendarCache.ts',
    'src/storage/updates.ts',
    'src/storage/dataRemoval.ts',
  ])('%s takes its keys from domain/storeKeys.ts, with no key literal of its own', file => {
    const text = read(file);
    expect(text).toContain("from '../domain/storeKeys'");
    expect(text).not.toMatch(/['`](gtdpara|kept):[A-Za-z]/);
  });
});

describe('markers written into notes', () => {
  it('keeps the mark marker and still reads one', () => {
    expect(MARK_USERDATA_PREFIX).toBe('gtdpara:mark:');
    expect(markUserData('a1')).toBe('gtdpara:mark:a1');
    expect(markDoneUserData('a1')).toBe('gtdpara:mark:a1:done');
    expect(parseMarkUserData('gtdpara:mark:a1')).toEqual({id: 'a1', done: false});
  });

  it('keeps the note heading, piece, meeting block and note link markers', () => {
    expect(NOTE_HEADING_USERDATA).toBe('gtdpara:note-heading:v1');
    expect(notePieceUserData(2)).toBe('gtdpara:note-piece:2:v1');
    expect(MEETING_NOTE_BLOCK_USERDATA).toBe('gtdpara:meeting-note-block:v1');
    expect(NOTE_LINK_USERDATA).toBe('gtdpara:meeting-note-link:v1');
  });
});

describe('file formats', () => {
  it('keeps the profile format id', () => {
    expect(PROFILE_FILE_FORMAT).toBe('gtdpara-profile');
  });

  it('keeps the temp suffix of the atomic write, here and in the native module', () => {
    expect(writeTempPathFor('/p/Website/project.txt')).toBe('/p/Website/.project.txt.gtdpara-tmp');
    expect(read(`${NATIVE}/GtdParaFileModule.kt`)).toContain('.gtdpara-tmp');
  });
});
