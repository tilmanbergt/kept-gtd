import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, shows, tap} from '../../test-helpers/scenario/app';
import {putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {serializeProfile} from '../../src/domain/profiles';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';

const DESIGN = 'technical-design-fresh-start-profile.md';
const NOTE = '/storage/emulated/0/Note';
const PRODUCTION = '/storage/emulated/0/EXPORT/kept-gtd/profiles/production.json';
const READ = 'plugin.permission.FILE:READ';
const WRITE = 'plugin.permission.FILE:WRITE';
const ACCESS_LINE = 'Kept needs to read and write your Project and Area folders and its own files in EXPORT/kept-gtd.';
const STOP_LINE = "Kept can't work without access to your files.";

function filesNotAllowedYet(): void {
  device().sdk.deniedPermissions.add(READ);
  device().sdk.deniedPermissions.add(WRITE);
}

const fileCalls = (): string[] => device().sdk.permissionCalls.filter(c => c.includes('FILE:'));

scenario('On a fresh install nothing asks for file access before the assistant says why', {feature: 'Settings', design: DESIGN}, () => {
  const seen: Array<[string, boolean]> = [];
  given('a fresh install where Kept may not read or write files yet', () => {
    filesNotAllowedYet();
    device().sdk.onPermissionCall = call => {
      if (call.includes('FILE:')) seen.push([call, shows(ACCESS_LINE)]);
    };
  });
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('every file permission call came while the assistant showed why it needs access', () => {
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.filter(([, shown]) => !shown)).toEqual([]);
  });
});

scenario('The assistant asks to read, then to write, then looks at the folders and the saved profiles', {feature: 'Settings', design: DESIGN}, () => {
  given('a fresh install with a folder "Projects" and a saved profile, and no file access yet', () => {
    filesNotAllowedYet();
    putFile(`${NOTE}/Projects/Garden renovation/notes.txt`, 'x');
    putFile(PRODUCTION, serializeProfile('Production', DEFAULT_SETTINGS, new Date('2026-11-01T09:00:00Z'), '0.24.0'));
  });
  when('Kept starts for the first time and I allow both dialogs', () => openApp({fresh: true}));
  then('read was asked before write, one dialog each', () => {
    expect(device().sdk.permissionRequests.filter(p => p.includes('FILE:'))).toEqual([READ, WRITE]);
    expect(fileCalls().slice(0, 4)).toEqual([`has ${READ}`, `request ${READ}`, `has ${WRITE}`, `request ${WRITE}`]);
  });
  and('then Welcome back offers the saved profile, and Start fresh suggests the existing folder', async () => {
    expectShows('Welcome back');
    await tap('Start fresh');
    expectShows('Setup · 1 of 5');
    expectShows('exists · 1 folder');
  });
});

scenario('Without file access the assistant stops and offers Try again', {feature: 'Settings', design: DESIGN}, () => {
  given('a fresh install with a saved profile, and I deny the file dialog', () => {
    filesNotAllowedYet();
    device().sdk.refuseRequests = true;
    putFile(PRODUCTION, serializeProfile('Production', DEFAULT_SETTINGS, new Date('2026-11-01T09:00:00Z'), '0.24.0'));
  });
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('the assistant says it cannot work without access, with Try again and Skip', () => {
    expectShows(STOP_LINE);
    expectShows('Try again');
    expectShows('Skip');
  });
  and('nothing was scanned or planned, write was not asked, and no Welcome back shows', () => {
    expectNotShows('will be created');
    expectNotShows('Setup · 1 of 5');
    expectNotShows('Welcome back');
    expect(device().sdk.permissionRequests.filter(p => p.includes('FILE:'))).toEqual([READ]);
  });
  when('I tap Try again and allow the dialogs', async () => {
    device().sdk.refuseRequests = false;
    await tap('Try again');
  });
  then('the assistant goes on: Welcome back offers the saved profile', () => {
    expectNotShows(STOP_LINE);
    expectShows('Welcome back');
    expectShows('Load "Production"');
  });
});
