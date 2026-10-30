import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, storedSettings, tap, type} from '../../test-helpers/scenario/app';
import {putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const NOTE = '/storage/emulated/0/Note';

scenario('A fresh install opens the setup assistant; Finish saves the folders found and creates only the missing ones', {feature: 'Settings', design: 'technical-design-easy-start.md'}, () => {
  given('Note holds a folder "Projects" with 3 project folders and nothing else of PARA', () => {
    for (const p of ['Garden renovation', 'Team offsite', 'Bike repair']) putFile(`${NOTE}/Projects/${p}/notes.txt`, 'x');
  });
  when('Kept starts for the first time', () => openApp({fresh: true}));
  then('Settings shows the assistant on its Folders step, suggesting Projects', () => {
    expectShows('Setup · 1 of 4');
    expectShows('exists · 3 folders');
    expectShows('Change later: Settings → Data');
    expectShows('Skip');
  });
  when('I go through Notes (keep one notebook) and Features (Everything) to Finish', async () => {
    await tap('Next ›');
    expectShows('Setup · 2 of 4');
    await tap('Next ›');
    await tap(/ Everything$/);
    await tap('Next ›');
    expectShows('Create demo space');
    await tap('Next ›');
  });
  then('Finish lists exactly the folders it will create', () => {
    expectShows('Kept will create in Note: 2 Areas, 3 Resources, 4 Archive.');
  });
  when('I tap Finish', () => tap('Finish'));
  then('the folders are created, Projects is kept as it is, and the Projects tab says what happened', async () => {
    const fs = device().fs;
    expect(fs.paths(NOTE).filter(p => !p.includes('/Projects/') && p !== `${NOTE}/Projects`)).toEqual([`${NOTE}/2 Areas`, `${NOTE}/3 Resources`, `${NOTE}/4 Archive`]);
    expect(fs.paths(`${NOTE}/Projects`)).toHaveLength(6);
    expectShows(/^Created 2 Areas, 3 Resources, 4 Archive in Note\. Setup saved\. Create your first project here\.$/);
    expectShows('+ Create Project');
  });
  and('the settings hold the choices', async () => {
    const s = await storedSettings();
    expect(s).toMatchObject({projectsFolder: 'Projects', setupAssistant: 'done', experimentalGoogleCalendar: true, experimentalGmail: true, modules: {closeOut: true}});
    expect(s.noteSetupDefaults.notebook).not.toBeNull();
  });
});

scenario('Skip closes the assistant without saving or creating anything', {feature: 'Settings', design: 'technical-design-easy-start.md'}, () => {
  when('Kept starts for the first time and I tap ? Help', async () => {
    await openApp({fresh: true});
    await tap('? Help');
  });
  then('the help opens at Getting started, "Your folders"', () => {
    expectShows(/^Getting started/);
    expectShows('Your folders');
  });
  when('I close the help and tap Skip', async () => {
    await tap('✕ Close');
    await tap('Skip');
  });
  then('Settings shows its tabs, no folder was created, and the assistant is done', async () => {
    expectShows('Run setup assistant');
    expectNotShows('Setup · 1 of 4');
    expect(device().fs.paths('/storage/emulated/0/Note')).toEqual([]);
    const s = await storedSettings();
    expect(s.setupAssistant).toBe('done');
    expect(s.projectsFolder).toBe('1 Projects');
  });
});

scenario('An existing install opens on Daily as before; Run setup assistant starts it from Settings → Data, Simple with own notes', {feature: 'Settings', design: 'technical-design-easy-start.md'}, () => {
  when('Kept starts with stored settings', () => openApp());
  then('it lands on Daily, without the assistant', () => {
    expectNotShows('Setup · 1 of 4');
    expectShows(/^Today/);
  });
  when('I tap Run setup assistant on Settings → Data, choose own notes and Simple, and Finish', async () => {
    await tap('Settings');
    await tap('Run setup assistant');
    await tap('Next ›');
    await tap(/ Own note per todo or meeting$/);
    await tap('Next ›');
    await tap(/ Simple$/);
    await tap('Next ›');
    await tap('Next ›');
    await tap('Finish');
  });
  then('close-out, Calendar, Gmail and Notebook contents are off and the Default has no notebook', async () => {
    const s = await storedSettings();
    expect(s).toMatchObject({modules: {closeOut: false}, experimentalGoogleCalendar: false, experimentalGmail: false, notebookContentsEnabled: false});
    expect(s.noteSetupDefaults.notebook).toBeNull();
  });
  and('Run setup assistant waits while the Folders fields have unsaved changes', async () => {
    await tap('Settings');
    await type('1 Projects', 'Work projects');
    expectShows('Save or reset the folder fields first.');
  });
});
