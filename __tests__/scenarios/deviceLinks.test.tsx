import {forgetDeviceRoots} from '../../src/storage/deviceRoots';
import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, labelled, openApp, reopenApp, shows, tap, tapLabel, tapTab, type} from '../../test-helpers/scenario/app';
import {dataFile, projectDir, projectFile, putFile, sectionLines} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const BOOK = '/storage/emulated/0/Document/Book.pdf';
const GARDEN = 'Garden renovation';

function gardenWithTodo(): void {
  putFile(projectFile(GARDEN), dataFile('project', {Scope: [], Tasks: ['- [ ] Order soil'], Meetings: []}));
}

scenario('Link a PDF from Document on the Device tab; re-editing finds it there', {feature: 'Your files', design: 'technical-design-easy-start.md'}, () => {
  given('project "Garden renovation" has the todo "Order soil", Document holds Book.pdf, and the device has Android and DCIM folders', () => {
    forgetDeviceRoots();
    gardenWithTodo();
    putFile(BOOK, '%PDF');
    putFile('/storage/emulated/0/Android/data/x.txt', 'x');
    putFile('/storage/emulated/0/DCIM/photo.jpg', 'x');
  });
  when('I tap the todo on the project page, tap +clip on its card and open the Device tab', async () => {
    await openApp();
    await tapTab('Projects');
    await tap(new RegExp(`^${GARDEN}`));
    await tap('Order soil');
    await tapLabel('Link file');
    await tap('Device');
  });
  then('the Device tab lists the Supernote folders only: Document, not Android or DCIM', () => {
    expectShows('📁 Document ›');
    expectShows('📁 Note ›');
    expectNotShows('📁 Android ›');
    expectNotShows('📁 DCIM ›');
  });
  when('I open Document and tap Book.pdf', async () => {
    await tap('📁 Document ›');
    await tap('📄 Book.pdf');
  });
  then('the todo links the PDF by its full path', () => {
    expect(sectionLines(projectFile(GARDEN), 'Tasks')[0]).toBe(`- [ ] Order soil +[[${BOOK}]]`);
  });
  and('selecting the todo again shows the Device tab at Document', async () => {
    await tap('Order soil');
    expect(shows(/Device › Document/)).toBe(true);
    expectShows('📄 Book.pdf');
  });
});

scenario('This file: link the PDF Kept was opened from, with its page, in the Files pane and from Quick Add', {feature: 'Your files', design: 'technical-design-easy-start.md'}, () => {
  given('project "Garden renovation" has the todo "Order soil" and Document holds Book.pdf', () => {
    forgetDeviceRoots();
    gardenWithTodo();
    putFile(BOOK, '%PDF');
  });
  when('I open Kept from page 12 of Book.pdf, open the project and tap +clip on the todo', async () => {
    device().sdk.currentPage = 11;
    await openApp({fromNote: BOOK});
    await tapTab('Projects');
    await tap(new RegExp(`^${GARDEN}`));
    await tap('Order soil');
    await tapLabel('Link file');
  });
  then('the Files pane shows both This-file rows on top', () => {
    expectShows('This file · p. 12');
    expectShows('This file');
  });
  when('I tap "This file · p. 12"', () => tap('This file · p. 12'));
  then('the todo links the PDF at page 12', () => {
    expect(sectionLines(projectFile(GARDEN), 'Tasks')[0]).toBe(`- [ ] Order soil +[[${BOOK}#page=12]]`);
  });
  when('I close the card and add the todo "Read chapter 3" with Quick Add', async () => {
    await tapLabel('Close');
    expect(labelled('p. 12')?.on).toBe(true);
    await type('New task', 'Read chapter 3');
    await tap('+ Add');
  });
  then('the new todo links the page too: the line is on by default for a document', () => {
    expect(sectionLines(projectFile(GARDEN), 'Tasks')[1]).toMatch(new RegExp(`^- \\[ \\] Read chapter 3 \\+\\[\\[${BOOK.replace(/\//g, '\\/')}#page=12\\]\\]`));
  });
});

scenario('This file from a note: Quick Add starts off and links the note relative to Note; from Home nothing is offered', {feature: 'Your files', design: 'technical-design-easy-start.md'}, () => {
  const NOTE = `${projectDir(GARDEN)}/Ideas.note`;
  given('project "Garden renovation" has the todo "Order soil" and the note Ideas.note', () => {
    forgetDeviceRoots();
    gardenWithTodo();
    device().sdk.putNote(NOTE, [{}, {}]);
  });
  when('I open Kept from page 2 of Ideas.note and open the project', async () => {
    device().sdk.currentPage = 1;
    await openApp({fromNote: NOTE});
    await tapTab('Projects');
    await tap(new RegExp(`^${GARDEN}`));
  });
  then('Quick Add shows the note, switched off', () => {
    expectShows('Ideas.note');
    expect(labelled('p. 2')?.on).toBe(false);
    expect(labelled('no page')?.on).toBe(false);
  });
  when('I switch on "no page" and add the todo "Sketch the beds"', async () => {
    await tap('no page');
    await type('New task', 'Sketch the beds');
    await tap('+ Add');
  });
  then('the todo links the note by its path inside Note, without a page', () => {
    expect(sectionLines(projectFile(GARDEN), 'Tasks')[1]).toMatch(/^- \[ \] Sketch the beds \+\[\[1 Projects\/Garden renovation\/Ideas\.note\]\]/);
  });
  when('I reopen Kept from Home, open the project and tap +clip on "Order soil"', async () => {
    await reopenApp();
    await tapTab('Projects');
    await tap(new RegExp(`^${GARDEN}`));
    expectNotShows('Ideas.note');
    await tap('Order soil');
    await tapLabel('Link file');
  });
  then('neither Quick Add nor the Files pane offers This file', () => {
    expectShows(/^Select attachment/);
    expectNotShows('This file');
    expectNotShows('no page');
  });
});
