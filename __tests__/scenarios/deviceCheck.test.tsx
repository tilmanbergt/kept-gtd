import {device} from '../../test-helpers/fakeDevice/device';
import {expectNotShows, expectShows, openApp, tap, tapTab} from '../../test-helpers/scenario/app';
import {putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';

const BOOK = '/storage/emulated/0/Document/Garden/Book.pdf';
const SD_EPUB = '/storage/1234-ABCD/Books/Guide.epub';

scenario('Check device files lists the folders, the SD card and the file Kept was opened from', {feature: 'Settings', design: 'technical-design-easy-start.md'}, () => {
  given('a PDF in Document/Garden, an EPUB on an SD card, and debug logging on', () => {
    putFile(BOOK, '%PDF');
    putFile(SD_EPUB, 'epub');
    putFile('/storage/emulated/0/EXPORT/kept-gtd/readme.txt', 'x');
  });
  when('I open Kept from page 12 of Book.pdf and tap Settings → Advanced → Check device files', async () => {
    device().sdk.currentPage = 11;
    await openApp({fromNote: BOOK, settings: {debugLogging: true}});
    await tapTab('Settings');
    await tap('Advanced');
    await tap('Check device files');
  });
  then('each listing shows its top folders, the SD card included, and the file with its page', () => {
    expectShows(/^\/storage\/emulated\/0: \d+ folders, 0 files - .*Document.*EXPORT/);
    expectShows('/storage/emulated/0/Document: 1 folders, 0 files - Garden');
    expectShows(/^\/storage: 2 folders, 0 files - 1234-ABCD, emulated$/);
    expectShows('/storage/1234-ABCD: 1 folders, 0 files - Books');
    expectShows(`${BOOK} · current page 11 (as the SDK reports it)`);
    expectShows(`PDF: ${BOOK}`);
    expectShows(`EPUB: ${SD_EPUB}`);
  });
  when('I tap Open (last page) on the PDF', async () => {
    await tap('Open (last page)');
  });
  then('the host is asked to open it at its last page', () => {
    expect(device().sdk.opened).toEqual([{path: BOOK, page: -1}]);
  });
  when('I tap Open this file at page 11', async () => {
    await tap('Open this file at page 11');
  });
  then('the host is asked to open the launch file at that page', () => {
    expect(device().sdk.opened[1]).toEqual({path: BOOK, page: 11});
  });
  and('Close returns to Advanced', async () => {
    await tap('Close');
    expectShows('Run Integrity Check');
  });
});

scenario('Check device files is hidden while debug logging is off', {feature: 'Settings', design: 'technical-design-easy-start.md'}, () => {
  when('I open Settings → Advanced with debug logging off', async () => {
    await openApp();
    await tapTab('Settings');
    await tap('Advanced');
  });
  then('there is no Check device files', () => {
    expectNotShows('Check device files');
  });
});
