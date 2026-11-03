import {isoDateOffset} from '../../src/domain/meetingTime';
import {NOTE_CREATION_BLOCKED_TEXT} from '../../src/domain/noteCreation';
import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, tap, tapLabel, tapTab} from '../../test-helpers/scenario/app';
import {areaDir, areaFile, dataFile, fileText, putFile} from '../../test-helpers/scenario/files';
import {given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {sparringSettings} from '../../test-helpers/scenario/setups';

const DESIGN = 'technical-design-launch-ready.md';
const BOOK = '/storage/emulated/0/Document/Garden/Book.pdf';
const d1 = isoDateOffset(-3);
const NOTEBOOK = `${areaDir('Coaching')}/Meetings/sparring jordan ${d1.slice(0, 4)}.note`;
const sparringLine = `- ${d1} 10:00-11:00 Sparring Jordan #sparring/jordan`;

function coachingWithoutNotebook(): void {
  putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: [], Meetings: [sparringLine]}, ['abbrev: Co']));
  putFile(BOOK, '%PDF');
}

scenario('Opened from a PDF, a note that needs a new file is not tried: the status says why', {feature: 'Note setups', design: DESIGN}, () => {
  given('a sparring session whose notebook does not exist yet, and a PDF', coachingWithoutNotebook);
  when('I open Kept from the PDF, open the session and tap Reflect', async () => {
    await openApp({fromNote: BOOK, settings: sparringSettings()});
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap(/^Sparring Jordan/);
    await tapLabel('Reflect');
  });
  then('the status line says Supernote does not allow it, nothing is asked and no note is made', () => {
    expectShows(NOTE_CREATION_BLOCKED_TEXT);
    expectNotShows('Add pages');
    expect(device().sdk.note(NOTEBOOK)).toBeNull();
    expect(fileText(areaFile('Coaching'))).toContain(sparringLine);
    expect(fileText(areaFile('Coaching'))).not.toContain('→ [[');
  });
});

scenario('Opened from a note, the same Reflect asks first and creates the notebook', {feature: 'Note setups', design: DESIGN}, () => {
  given('the same session, and a note to open Kept from', () => {
    coachingWithoutNotebook();
    device().sdk.putNote('/storage/emulated/0/Note/Ideas.note');
  });
  when('I open Kept from the note, open the session and tap Reflect', async () => {
    await openApp({fromNote: '/storage/emulated/0/Note/Ideas.note', settings: sparringSettings()});
    await tapTab('Areas');
    await tap(/^Coaching/);
    await tap(/^Sparring Jordan/);
    await tapLabel('Reflect');
  });
  then('Kept asks before it creates anything', () => {
    expectNotShows(NOTE_CREATION_BLOCKED_TEXT);
    expectShows(/^Sparring: /);
  });
});
