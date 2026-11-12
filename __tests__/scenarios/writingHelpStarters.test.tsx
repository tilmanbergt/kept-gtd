// docs/dev/history/technical-design-calmer-screens.md §6 scenarios 6-8: Thread · Loop · Paste on an empty title.
import Clipboard from '@react-native-clipboard/clipboard';
import {createNoteSetup, NoteSetup, seedNoteSetupDefaults} from '../../src/domain/noteSetups';
import {expectNotShows, expectShows, fieldValue, focus, openApp, tap, tapLabel, tapTab, type} from '../../test-helpers/scenario/app';
import {areaFile, dataFile, INBOX_FILE, putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const TITLE = 'New meeting';
const settings = () => {
  const sparring: NoteSetup = {...createNoteSetup('1', 'thread'), name: 'Sparring', tags: ['sparring']};
  const offsite: NoteSetup = {...createNoteSetup('2', 'loop'), name: 'Offsite', tags: ['offsite']};
  return {noteSetups: [sparring, offsite], noteSetupDefaults: seedNoteSetupDefaults(), nextNoteSetupId: 3};
};
const space = () => {
  putFile(areaFile('Coaching'), dataFile('area', {Scope: [], Tasks: [], Meetings: ['- 2026-10-01 10:00 Sparring Jordan #sparring/jordan']}));
  putFile(INBOX_FILE, dataFile('inbox', {Tasks: [], Meetings: []}));
};
const openMeetingTitle = async () => {
  await openApp({settings: settings()});
  await tapTab('Daily');
  await tap('+ Meeting');
  await focus(TITLE);
};

scenario('An empty meeting title offers Thread and Loop, and Paste while the clipboard has text', {feature: 'Writing help', design: 'technical-design-calmer-screens.md', help: 'quick-add.md#starting-with-a-thread-or-loop'}, () => {
  given('a Thread setup on #sparring and a Loop setup on #offsite', space);
  when('I open + Meeting on Daily and put the cursor into the title', openMeetingTitle);
  then('the strip shows Thread and Loop, no Paste', () => {
    expectShows('Thread');
    expectShows('Loop');
    expectNotShows('Paste');
  });
  when('there is text on the clipboard and the cursor comes into the title again', async () => {
    (Clipboard.getString as jest.Mock).mockResolvedValue('Agenda');
    await focus(TITLE, false);
    await focus(TITLE);
  });
  then('Paste is offered too', () => expectShows('Paste'));
  (Clipboard.getString as jest.Mock).mockResolvedValue('');
});

scenario('Thread, then #sparring: the title reads #sparring/ and the strip offers its counterparts', {feature: 'Writing help', design: 'technical-design-calmer-screens.md', help: 'quick-add.md#starting-with-a-thread-or-loop'}, () => {
  given('a Thread setup on #sparring and the counterpart jordan in use', space);
  when('I open + Meeting on Daily, put the cursor into the title and tap Thread', async () => {
    await openMeetingTitle();
    await tap('Thread');
  });
  then('the strip lists #sparring and ‹', () => {
    expectShows('#sparring');
    expectShows('‹');
  });
  when('I tap #sparring', () => tap('#sparring'));
  then('the title reads "#sparring/"', () => expect(fieldValue(TITLE)).toBe('#sparring/'));
  and('the strip offers the counterpart', () => expectShows(/^#sparring\/jordan/));
});

scenario('With text in the title, the strip offers no starters; its square switches to All · Copy · Cut · Paste', {feature: 'Writing help', design: 'technical-design-quickadd-redesign.md', help: 'quick-add.md#starting-with-a-thread-or-loop'}, () => {
  given('a Thread setup on #sparring', space);
  when('I open + Meeting on Daily, write "Retro" and put the cursor into the title', async () => {
    await openApp({settings: settings()});
    await tapTab('Daily');
    await type(TITLE, 'Retro');
    await focus(TITLE);
  });
  then('no Thread or Loop; the square shows the clipboard buttons', async () => {
    expectNotShows('Thread');
    expectNotShows('Loop');
    await tapLabel('Clipboard');
    expectShows('All');
    expectShows('Copy');
  });
});
