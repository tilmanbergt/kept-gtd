import AsyncStorage from '@react-native-async-storage/async-storage';
import {initialChoices, planRemoval, RemovalChoices} from '../../src/domain/dataRemoval';
import {runRemoval, scanRemoval, StepOutcomeList} from '../../src/storage/dataRemoval';
import {device} from '../../test-helpers/fakeDevice/device';
import {PRIVATE_DIR} from '../../test-helpers/fakeDevice/fakeFs';
import {areaFile, dataFile, INBOX_FILE, PATHS, projectDir, projectFile, putFile} from '../../test-helpers/scenario/files';
import {storeSettings} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const DESIGN = 'technical-design-remove-data.md';
const S = '/storage/emulated/0';
const NOTE = `${projectDir('Garden renovation')}/Garden renovation 2026.note`;
const OTHER_PLUGIN_KEY = 'otherplugin:settings';

/** Kept's data everywhere §3 lists, plus a note and another plugin's entry that must stay. */
async function keptEverywhere(settings = {}): Promise<void> {
  await storeSettings(settings);
  await AsyncStorage.setItem('gtdpara:profileSecrets:v1', JSON.stringify({production: {gmailAppPassword: 'abcd efgh'}, demo: {}}));
  await AsyncStorage.setItem('gtdpara:tagUsage:v1', '[]');
  await AsyncStorage.setItem('gtdpara:tagUsage:v1:demo', '[]');
  await AsyncStorage.setItem(OTHER_PLUGIN_KEY, 'theirs');
  putFile(projectFile('Garden renovation'), dataFile('project', {Tasks: ['- [ ] Measure the raised beds #next']}));
  putFile(NOTE, 'handwriting');
  putFile(areaFile('Home'), dataFile('area', {Tasks: []}));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: []}));
  putFile(`${PATHS.archive}/2025/Home/Kitchen/project.txt`, dataFile('project', {Tasks: []}));
  putFile(`${PRIVATE_DIR}/data/marks/m-1/picture.png`, 'png');
  putFile(`${PRIVATE_DIR}/tmp/page-1.png`, 'png');
  putFile(`${S}/EXPORT/kept-gtd/debug/kept-gtd-log.txt`, 'log');
  putFile(`${S}/EXPORT/kept-gtd/debug/perf/trace.jsonl`, '{}');
  putFile(`${S}/EXPORT/kept-gtd/profiles/production.json`, '{"name":"Production"}');
  putFile(`${S}/EXPORT/kept-gtd/profiles/demo.json`, '{"name":"Demo"}');
  putFile(`${S}/Note/kept-gtd-demo/1 Projects/Garden renovation/project.txt`, 'demo');
}

async function removeWith(patch: Partial<RemovalChoices> = {}, saveProfileFirst = false): Promise<StepOutcomeList> {
  const {inventory, targets} = await scanRemoval();
  const choices = {...initialChoices(inventory), ...patch};
  return runRemoval(planRemoval(choices, saveProfileFirst), targets, 'Remove Kept data');
}

const keptKeys = async () => (await AsyncStorage.getAllKeys()).filter(k => k.startsWith('gtdpara:'));

scenario('Removing with the defaults leaves no Kept data but keeps profiles, data files and notes', {feature: 'Remove data', design: DESIGN}, () => {
  given('Kept has data in every place it uses', () => keptEverywhere());
  when('I remove with the defaults', () => removeWith());
  then('no Kept entry, log, demo space or private file is left', async () => {
    expect(await keptKeys()).toEqual([]);
    expect(device().fs.paths(`${S}/EXPORT/kept-gtd/debug`)).toEqual([]);
    expect(device().fs.paths(`${S}/Note/kept-gtd-demo`)).toEqual([]);
    expect(device().fs.paths(`${PRIVATE_DIR}/data`)).toEqual([]);
    expect(device().fs.paths(`${PRIVATE_DIR}/tmp`)).toEqual([]);
    expect(device().fs.exists(`${S}/EXPORT/kept-gtd/profiles/demo.json`)).toBe(false);
  });
  and('the profiles, every data file, the note and the other plugin stay', async () => {
    expect(device().fs.exists(`${S}/EXPORT/kept-gtd/profiles/production.json`)).toBe(true);
    expect(device().fs.exists(projectFile('Garden renovation'))).toBe(true);
    expect(device().fs.exists(`${PATHS.archive}/2025/Home/Kitchen/project.txt`)).toBe(true);
    expect(device().fs.exists(NOTE)).toBe(true);
    expect(await AsyncStorage.getItem(OTHER_PLUGIN_KEY)).toBe('theirs');
  });
});

scenario('A failing log deletion still removes the rest and keeps the settings', {feature: 'Remove data', design: DESIGN}, () => {
  given('Kept has data in every place it uses, and deleting the logs will fail', async () => {
    await keptEverywhere();
    device().fs.failNext('deleteKeptTree', /\/debug$/, 'disk busy');
  });
  let outcomes: StepOutcomeList = [];
  when('I remove with the defaults', async () => {
    outcomes = await removeWith();
  });
  then('the logs report the failure, the settings are kept and the rest is gone', async () => {
    expect(outcomes.find(o => o.step === 'logs')?.error).toBe('disk busy');
    expect(outcomes.find(o => o.step === 'settings')?.skipped).toBe(true);
    expect(await keptKeys()).toEqual(['gtdpara:settings:v1']);
    expect(device().fs.paths(`${S}/Note/kept-gtd-demo`)).toEqual([]);
  });
});

scenario('Save the active profile first keeps the setup in production.json', {feature: 'Remove data', design: DESIGN}, () => {
  given('my Projects folder is "Work projects"', () => keptEverywhere({projectsFolder: 'Work projects'}));
  when('I remove the settings with Save the active profile first on', () => removeWith({}, true));
  then('production.json holds the folder and the settings are gone', async () => {
    expect(device().fs.get(`${S}/EXPORT/kept-gtd/profiles/production.json`)).toContain('Work projects');
    expect(await AsyncStorage.getItem('gtdpara:settings:v1')).toBeNull();
  });
});

scenario("Removing Kept's data files leaves the folders, notes and other files", {feature: 'Remove data', design: DESIGN}, () => {
  given('Kept has data in every place it uses', () => keptEverywhere());
  when("I also check Kept's data files", () => removeWith({dataFiles: true}));
  then('project.txt, area.txt, Inbox.txt and the archived project.txt are gone', () => {
    expect(device().fs.exists(projectFile('Garden renovation'))).toBe(false);
    expect(device().fs.exists(areaFile('Home'))).toBe(false);
    expect(device().fs.exists(INBOX_FILE)).toBe(false);
    expect(device().fs.exists(`${PATHS.archive}/2025/Home/Kitchen/project.txt`)).toBe(false);
  });
  and('the project folder and its note stay', () => {
    expect(device().fs.exists(NOTE)).toBe(true);
  });
});

scenario('The scan counts what is there', {feature: 'Remove data', design: DESIGN}, () => {
  given('Kept has data in every place it uses', () => keptEverywhere());
  then('each kind has its count and the open mark is counted', async () => {
    const {inventory} = await scanRemoval();
    expect(inventory.counts).toMatchObject({settings: 1, secrets: 2, caches: 2, privateData: 2, logs: 2, demo: 2, dataFiles: 4, profiles: 2, legacy: 0, saveCopies: 0});
    expect(inventory.openMarks).toBe(1);
  });
});
