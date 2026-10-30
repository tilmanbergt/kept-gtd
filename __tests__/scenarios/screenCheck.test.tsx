import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, tap, tapTab} from '../../test-helpers/scenario/app';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const MANTA_NOTE = '/storage/emulated/0/Note/Sketches.note';
const TEST_NOTE = '/storage/emulated/0/EXPORT/kept-gtd/debug/landscape-test.note';

scenario('Check screen and pages shows the launch note\'s page size and tries a horizontal test note', {feature: 'Settings', design: 'technical-design-launch-ready.md'}, () => {
  given('a two-page note made on a Manta, and debug logging on', () => {
    device().sdk.putNote(MANTA_NOTE, [{}, {}], 'style_white', {size: {width: 1920, height: 2560}, machineType: 5});
  });
  when('I open Kept from page 2 of that note and tap Settings → Advanced → Check screen and pages', async () => {
    device().sdk.currentPage = 1;
    await openApp({fromNote: MANTA_NOTE, settings: {debugLogging: true}});
    await tapTab('Settings');
    await tap('Advanced');
    await tap('Check screen and pages');
  });
  then('it shows the screen and the note\'s page count, page size and device', () => {
    expectShows(/^This screen: /);
    expectShows(/^Window: \d+ × \d+ dp · screen: /);
    expectShows('Note/Sketches.note · current page 2');
    expectShows('2 pages · page 2: 1920 × 2560 px · made on Manta');
  });
  when('I tap Create horizontal test note', async () => {
    await tap('Create horizontal test note');
  });
  then('a horizontal note is created in Kept\'s debug folder, not among my notes', () => {
    expect(device().sdk.note(TEST_NOTE)?.size).toEqual({width: 1872, height: 1404});
    expectShows('1 page · page 1: 1872 × 1404 px · made on A5 X');
  });
  when('I tap Add a page and then Write test text boxes', async () => {
    await tap('Add a page');
    await tap('Write test text boxes');
  });
  then('the new page has three text boxes at the A5 X reference positions', () => {
    expectShows('2 pages · page 2: 1872 × 1404 px · made on A5 X');
    expectShows('Text boxes at y 100, 1300 and 1600 written on page 2.');
    const boxes = device().sdk.note(TEST_NOTE)!.pages[1].elements.map(el => (el.textBox as unknown as {textRect: {top: number}}).textRect.top);
    expect(boxes).toEqual([100, 1300, 1600]);
  });
  and('Open test note asks the host to open it on its last page', async () => {
    await tap('Open test note');
    expect(device().sdk.opened).toEqual([{path: TEST_NOTE, page: 1}]);
  });
  and('Close returns to Advanced', async () => {
    await tap('Close');
    expectShows('Run Integrity Check');
  });
});

scenario('Check screen and pages is hidden while debug logging is off', {feature: 'Settings', design: 'technical-design-launch-ready.md'}, () => {
  when('I open Settings → Advanced with debug logging off', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Advanced');
  });
  then('there is no Check screen and pages', () => {
    expectNotShows('Check screen and pages');
  });
});
