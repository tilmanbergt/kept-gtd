import {act} from '@testing-library/react-native';
import {INTERNET_PERMISSION} from '../../src/supernote/pluginPermissions';
import {device} from '../../test-helpers/fakeDevice/device';
import {PRIVATE_DIR} from '../../test-helpers/fakeDevice/fakeFs';
import {expectNotShows, expectShows, openApp, reopenApp, settle, storedSettings, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {loggedErrors} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

// docs/dev/history/technical-design-in-app-updates.md §6, §8.
const DESIGN = 'technical-design-in-app-updates.md';
const SAVED = '/storage/emulated/0/MyStyle/kept-gtd/kept-gtd-99.0.0.snplg';

async function openAbout(): Promise<void> {
  await tapTab('Settings');
  await tap('About');
}

/** Past the daily check's delay after the first screen (ui/useUpdateNotice.ts). */
async function waitForDailyCheck(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 3200));
  });
  await settle();
}

/** Taps the ✕ of the status message that starts with `text` (other ✕ marks may come before it). */
async function dismiss(text: string): Promise<void> {
  const all = texts();
  const at = all.findIndex(t => t.startsWith(text));
  if (at < 0) throw new Error(`no message "${text}" on screen`);
  await tap('✕', all.slice(0, at).filter(t => t === '✕').length);
}

function privateTmpFiles(): string[] {
  return device().fs.calls.filter(c => c.path.startsWith(`${PRIVATE_DIR}/tmp/`) && c.method === 'deleteTempTree').map(c => c.path);
}

scenario('About says Kept is up to date when GitHub has nothing newer', {feature: 'Settings', design: DESIGN}, () => {
  given('the latest release on GitHub is 0.0.1', () => device().github.publish('0.0.1'));
  when('I open Settings → About and tap Check now', async () => {
    await openApp();
    await openAbout();
    await tap('Check now');
  });
  then('the status slot and the Updates block say it is up to date', () => {
    expectShows('Kept GTD is up to date (0.0.1).');
    expectShows(/^Up to date · checked /);
  });
  and('the check asked GitHub once and nothing was downloaded', () => {
    expect(device().github.requests).toEqual(['https://api.github.com/repos/tilmanbergt/kept-gtd/releases/latest']);
    expect(device().fs.exists('/storage/emulated/0/MyStyle/kept-gtd')).toBe(false);
  });
});

scenario('A newer release shows a notice; Download saves it into MyStyle/kept-gtd', {feature: 'Settings', design: DESIGN}, () => {
  given('GitHub has 99.0.0 and I checked for it in About', async () => {
    device().github.publish('99.0.0');
    await openApp();
    await openAbout();
    await tap('Check now');
    expectShows('Kept GTD 99.0.0 is available.');
  });
  when('I open Kept again', () => reopenApp());
  then('the notice says 99.0.0 is available, with Download and Details', () => {
    expectShows('Kept GTD 99.0.0 is available.');
    expectShows('Download');
    expectShows('Details');
  });
  when('I tap Download', () => tap('Download'));
  then('it says where the file is and how to install it', () => {
    expectShows(
      'Saved to MyStyle/kept-gtd/kept-gtd-99.0.0.snplg. To install: close Kept, then Settings → Plugins → Add plugin → choose this file. Your data stays where it is.',
    );
  });
  and('the file in MyStyle/kept-gtd is the release asset, and the temp file is gone', () => {
    expect(device().fs.get(SAVED)).toBe(device().github.assets.values().next().value);
    expect(device().fs.exists(`${PRIVATE_DIR}/tmp/update-kept-gtd-99.0.0.snplg`)).toBe(false);
    expect(privateTmpFiles()).toEqual([`${PRIVATE_DIR}/tmp/update-kept-gtd-99.0.0.snplg`]);
  });
  when('I dismiss the message and tap Download in About again', async () => {
    await dismiss('Saved to MyStyle/kept-gtd/');
    await openAbout();
    expectShows('Downloaded: MyStyle/kept-gtd/kept-gtd-99.0.0.snplg');
    await tap('Download');
  });
  then('it is not downloaded twice', () => {
    expectShows(/^Already downloaded: MyStyle\/kept-gtd\/kept-gtd-99.0.0.snplg\./);
    expect(device().github.requests.filter(u => u.endsWith('.snplg'))).toHaveLength(1);
  });
  and('no error was logged', () => expect(loggedErrors()).toEqual([]));
});

scenario('A download that does not match the release leaves nothing in MyStyle', {feature: 'Settings', design: DESIGN}, () => {
  given('GitHub has 99.0.0, but its bytes arrive changed', async () => {
    device().github.publish('99.0.0');
    device().github.corrupt.add([...device().github.assets.keys()][0]);
    await openApp();
    await openAbout();
    await tap('Check now');
  });
  when('I tap Download', () => tap('Download', 1));
  then('it says nothing was saved', () => expectShows("The download didn't match the release on GitHub, so nothing was saved. Try again later."));
  and('MyStyle/kept-gtd holds no file, and the temp file is gone', () => {
    expect(device().fs.exists(SAVED)).toBe(false);
    expect(device().fs.exists(`${PRIVATE_DIR}/tmp/update-kept-gtd-99.0.0.snplg`)).toBe(false);
  });
});

scenario('Not now hides the notice for that version only', {feature: 'Settings', design: DESIGN}, () => {
  given('GitHub has 99.0.0 and Kept found it', async () => {
    device().github.publish('99.0.0');
    await openApp();
    await openAbout();
    await tap('Check now');
    await reopenApp();
    expectShows('Kept GTD 99.0.0 is available.');
  });
  when('I tap ✕ on the notice and open Kept again', async () => {
    await dismiss('Kept GTD 99.0.0 is available.');
    await reopenApp();
  });
  then('no notice shows, but About still offers 99.0.0', async () => {
    expectNotShows('Kept GTD 99.0.0 is available.');
    await openAbout();
    expectShows('Kept GTD 99.0.0 is available.');
    expectShows('99.0.0 · new');
  });
  when('GitHub gets 99.1.0, I check again and open Kept', async () => {
    device().github.publish('99.1.0');
    await tap('Check now');
    await reopenApp();
  });
  then('the notice shows the new version', () => expectShows('Kept GTD 99.1.0 is available.'));
});

scenario('The daily check without internet permission stays silent', {feature: 'Settings', design: DESIGN}, () => {
  given('the daily check is on, GitHub has 99.0.0, and Kept may not use the internet', () => {
    device().github.publish('99.0.0');
    device().sdk.deniedPermissions.add(INTERNET_PERMISSION);
  });
  when('I open Kept and wait for the daily check', async () => {
    await openApp({settings: {updateCheck: 'daily'}});
    await waitForDailyCheck();
  });
  then('no dialog was shown, nothing was fetched and no notice shows', () => {
    expect(device().sdk.permissionRequests).toEqual([]);
    expect(device().github.requests).toEqual([]);
    expectNotShows('Kept GTD 99.0.0 is available.');
  });
  and('About says the daily check needs internet access', async () => {
    await openAbout();
    expectShows('The daily check needs internet access - tap Check now.');
  });
});

scenario('The daily check with internet permission finds a new version without a dialog', {feature: 'Settings', design: DESIGN}, () => {
  given('the daily check is on and GitHub has 99.0.0', () => device().github.publish('99.0.0'));
  when('I open Kept and wait for the daily check', async () => {
    await openApp({settings: {updateCheck: 'daily'}});
    await waitForDailyCheck();
  });
  then('the notice shows, and no dialog was shown', () => {
    expectShows('Kept GTD 99.0.0 is available.');
    expect(device().sdk.permissionRequests).toEqual([]);
  });
  when('I open Kept again the same day', async () => {
    await reopenApp();
    await waitForDailyCheck();
  });
  then('GitHub was asked only once', () => expect(device().github.requests).toHaveLength(1));
});

scenario('Check automatically once a day is switched in About and asks for internet once', {feature: 'Settings', design: DESIGN}, () => {
  given('Kept may not use the internet yet', async () => {
    device().sdk.deniedPermissions.add(INTERNET_PERMISSION);
    await openApp();
  });
  when('I tick Check automatically once a day', async () => {
    await openAbout();
    await tap('☐ Check automatically once a day');
  });
  then('the choice is stored and the permission dialog showed', async () => {
    expect((await storedSettings()).updateCheck).toBe('daily');
    expect(device().sdk.permissionRequests).toEqual([INTERNET_PERMISSION]);
    expectShows('☑ Check automatically once a day');
  });
});

scenario('Update test: treat this build as 0.0.0 offers the latest real release', {feature: 'Settings', design: DESIGN}, () => {
  given('Debug logging is on and the latest release is 0.0.1', async () => {
    device().github.publish('0.0.1');
    await openApp({settings: {debugLogging: true}});
  });
  when('I switch on the update test on Advanced and tap Check now in About', async () => {
    await tapTab('Settings');
    await tap('Advanced');
    await tap(/^Update test: treat this build as 0\.0\.0/);
    await tap('About');
    await tap('Check now');
  });
  then('0.0.1 is offered', () => expectShows('Kept GTD 0.0.1 is available.'));
});
