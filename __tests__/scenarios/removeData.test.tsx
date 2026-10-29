import AsyncStorage from '@react-native-async-storage/async-storage';
import {device} from '../../test-helpers/fakeDevice/device';
import {PRIVATE_DIR} from '../../test-helpers/fakeDevice/fakeFs';
import {expectNotShows, expectShows, openApp, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {dataFile, projectFile, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const DESIGN = 'technical-design-remove-data.md';
const S = '/storage/emulated/0';

function keptFiles(): void {
  putFile(projectFile('Garden renovation'), dataFile('project', {Tasks: ['- [ ] Measure the raised beds #next']}));
  putFile(`${S}/EXPORT/kept-gtd/debug/kept-gtd-log.txt`, 'log');
  putFile(`${S}/EXPORT/kept-gtd/profiles/production.json`, '{"name":"Production"}');
  putFile(`${PRIVATE_DIR}/data/marks/m-1/picture.png`, 'png');
  putFile(`${PRIVATE_DIR}/data/marks/m-2/picture.png`, 'png');
}

async function openRemoveData(): Promise<void> {
  await tapTab('Settings');
  await tap("Remove Kept's data…");
}

scenario("Remove Kept's data lists every kind, with profiles and data files unchecked", {feature: 'Remove data', design: DESIGN}, () => {
  given('Kept has settings, a log, a profile, a project and two open marks', async () => {
    keptFiles();
    await openApp();
  });
  when("I open Settings → Data → Remove Kept's data…", openRemoveData);
  then('every kind shows with its count; empty ones say nothing here', () => {
    expectShows('☑ Settings · 1 entry');
    expectShows('☑ Debug and performance logs · 1 file');
    expectShows("☐ Kept's data files · 1 file");
    expectShows('☐ Saved profiles · 1 file');
    expectShows('☐ Demo space · nothing here');
    expectNotShows(/Old gtdpara folders/);
  });
  and('the open marks are warned about, and what stays is listed', () => {
    expectShows('2 open marks lose their picture and handwriting - process them first.');
    expectShows('Stays on your device');
    expectShows('☑ Save the active profile first');
  });
});

scenario('Removing with the defaults, then Start fresh, opens the setup assistant', {feature: 'Remove data', design: DESIGN}, () => {
  given('Kept has settings, a log, a profile, a project and open marks', async () => {
    keptFiles();
    await AsyncStorage.setItem('otherplugin:settings', 'theirs');
    await openApp();
    await openRemoveData();
  });
  when('I tap Remove… and confirm with Remove', async () => {
    await tap('Remove…');
    expectShows("Remove 3 kinds of data? This can't be undone.");
    await tap('Remove');
  });
  then('each step reports removed and the settings are gone', async () => {
    expectShows('Settings: removed');
    expectShows('Debug and performance logs: removed');
    expect((await AsyncStorage.getAllKeys()).filter(k => k.startsWith('gtdpara:'))).toEqual([]);
    expect(await AsyncStorage.getItem('otherplugin:settings')).toBe('theirs');
  });
  and('the profile was saved first, and the project file is still there', () => {
    expect(device().fs.get(`${S}/EXPORT/kept-gtd/profiles/production.json`)).toContain('"projectsFolder"');
    expect(device().fs.exists(projectFile('Garden renovation'))).toBe(true);
  });
  when('I tap Start fresh', () => tap('Start fresh'));
  then('the setup assistant opens as on a first install', () => {
    expectShows('Setup · 1 of 4');
  });
});

scenario('Cancel on the question removes nothing', {feature: 'Remove data', design: DESIGN}, () => {
  given("Remove Kept's data is open", async () => {
    keptFiles();
    await openApp();
    await openRemoveData();
  });
  when('I tap Remove… and then ✕ on the question', async () => {
    await tap('Remove…');
    await tap('✕');
  });
  then('nothing is removed and the list is still there', async () => {
    expect(await AsyncStorage.getItem('gtdpara:settings:v1')).not.toBeNull();
    expect(device().fs.exists(`${S}/EXPORT/kept-gtd/debug/kept-gtd-log.txt`)).toBe(true);
    expect(texts()).toContain('Stays on your device');
  });
});

scenario('With the demo profile active, the demo space goes only with the settings', {feature: 'Remove data', design: DESIGN}, () => {
  given('the demo profile is active and the demo space exists', async () => {
    putFile(`${S}/Note/kept-gtd-demo/1 Projects/Garden renovation/project.txt`, 'demo');
    await openApp({settings: {activeProfileId: 'demo'}});
    await openRemoveData();
  });
  when('I uncheck the settings', () => tap('☑ Settings · 1 entry'));
  then('the demo space is unchecked and says why', () => {
    expectShows('☐ Demo space · 1 file');
    expectShows('The demo profile is active: the demo space goes only together with the settings.');
  });
});
