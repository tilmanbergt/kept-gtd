// docs/dev/history/technical-design-perf-current-page.md §6 scenarios 2-8, §7: work done per open of a
// Current page on the fake device - renders per component (test-helpers/renderCounts.ts) and settings
// reads. The limits are the design's targets as far as the steps have reached them.
jest.mock('../../src/utils/perf', () => require('../../test-helpers/renderCounts').perfWithRenderCounts());

import AsyncStorage from '@react-native-async-storage/async-storage';
import {act} from '@testing-library/react-native';
import {expectShows, openApp, settle, tap, tapTab, texts} from '../../test-helpers/scenario/app';
import {areaDir, putFile} from '../../test-helpers/scenario/files';
import {device} from '../../test-helpers/fakeDevice/device';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {BIG_NOW, bigScopeFiles, bigScopeSettings} from '../../test-helpers/bigScope';
import {renderCounts, resetRenderCounts} from '../../test-helpers/renderCounts';
import {fixedClock} from '../../test-helpers/scenario/clock';

const SETTINGS_KEY = 'gtdpara:settings:v1';

const clock = () => fixedClock(BIG_NOW);
afterEach(() => jest.useRealTimers());

interface OpenWork {
  renders: Record<string, number>;
  settingsReads: number;
}

/**
 * Opens `item` from the Areas list while another item's page was the last one open (as when going from
 * one Area to the next: the page is built anew), and counts the work. On the device each settings read lands at its own time, and each one that sets state is a
 * render round; the fake storage answers at once, which lets React batch them all. So each read here
 * answers a few ticks after the one before, like on the device.
 */
async function openCounted(item: RegExp): Promise<OpenWork> {
  await tapTab('Areas');
  // The storage mock's getItem is a jest.fn: wrap its implementation, and put it back afterwards.
  const getItem = AsyncStorage.getItem as jest.Mock;
  const original = getItem.getMockImplementation()!;
  let reads = 0;
  getItem.mockImplementation(async (key: string) => {
    const ticks = key === SETTINGS_KEY ? 2 * ++reads : 0;
    for (let i = 0; i < ticks; i++) await new Promise(resolve => setTimeout(resolve, 0));
    return original(key);
  });
  resetRenderCounts();
  try {
    await tap(item);
    await settle(60);
  } finally {
    getItem.mockImplementation(original);
  }
  return {renders: renderCounts(), settingsReads: reads};
}

const work: Record<string, OpenWork> = {};

scenario('Opening an Area page renders each part a bounded number of times and reads no settings it knows', {feature: 'Projects and Areas', design: 'technical-design-perf-current-page.md'}, () => {
  given('the big data set and the app started', async () => {
    clock();
    for (const f of bigScopeFiles()) putFile(f.path, f.content);
    await openApp({settings: bigScopeSettings()});
  });
  when('I open Zen\'s page, then Atruvia\'s from the Areas list, then Zen\'s again', async () => {
    await tapTab('Areas');
    await tap(/^Zen/);
    work.atruvia = await openCounted(/^Atruvia/);
    work.zen = await openCounted(/^Zen/);
  });
  then('Quick Add, the page and its parts render at most as often as recorded', () => {
    for (const w of Object.values(work)) {
      expect(w.renders.QuickAddWidget ?? 0).toBeLessThanOrEqual(LIMITS.quickAdd);
      expect(w.renders.ItemDetail ?? 0).toBeLessThanOrEqual(LIMITS.itemDetail);
      expect(w.renders.ProjectDataPanel ?? 0).toBeLessThanOrEqual(LIMITS.projectDataPanel);
      for (const name of ONCE) expect([name, w.renders[name] ?? 0]).toEqual([name, 1]);
    }
  });
  and('the settings are read at most as often as recorded', () => {
    for (const w of Object.values(work)) expect(w.settingsReads).toBeLessThanOrEqual(LIMITS.settingsReads);
    // The numbers for the step report.
    process.stdout.write(`currentPagePerf: ${JSON.stringify(work)}\n`);
  });
});

const listings = (folder: string) => device().logs.filter(l => l.text === `FileBrowserPane: loading ${folder} `).length;

scenario('An Area page lists its folder only when the Files tab is opened', {feature: 'Projects and Areas', design: 'technical-design-perf-current-page.md'}, () => {
  given('the big data set and the app started', async () => {
    clock();
    for (const f of bigScopeFiles()) putFile(f.path, f.content);
    await openApp({settings: bigScopeSettings()});
  });
  when('I open Atruvia\'s page (the Threads tab is shown)', async () => {
    await tapTab('Areas');
    await tap(/^Atruvia/);
  });
  then('its folder is not listed', () => expect(listings(areaDir('Atruvia'))).toBe(0));
  // "Files" shows twice on this page; the Files tab is the last one.
  when('I tap Files', () => tap('Files', texts().filter(t => t === 'Files').length - 1));
  then('the folder is listed once and its entries show', () => {
    expect(listings(areaDir('Atruvia'))).toBe(1);
    expectShows('Meetings');
  });
});

scenario('Hiding done todos on an Area page changes the Todos list and nothing else, and is kept', {feature: 'Projects and Areas', design: 'technical-design-perf-current-page.md'}, () => {
  given('the big data set and Atruvia\'s page open', async () => {
    clock();
    for (const f of bigScopeFiles()) putFile(f.path, f.content);
    await openApp({settings: bigScopeSettings()});
    await tapTab('Areas');
    await tap(/^Atruvia/);
  });
  when('I tap "Hide done tasks"', async () => {
    // After the page's first e-ink flush, which builds Quick Add's other tabs once.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    await settle();
    resetRenderCounts();
    await tap('Hide done tasks');
  });
  then('the Todos list offers to show the done ones again, and neither Quick Add nor the left pane rendered', () => {
    expectShows(/^Show \d+ done tasks?$/);
    const counts = renderCounts();
    expect(counts.TodosSection).toBeGreaterThan(0);
    for (const name of ['QuickAddWidget', 'ItemDetail', 'FileBrowserPane', 'ThreadsTab', 'ItemFocusPanel', 'ItemStatusPanel']) expect([name, counts[name] ?? 0]).toEqual([name, 0]);
  });
  and('after opening Zen and coming back, done todos are still hidden', async () => {
    await tapTab('Areas');
    await tap(/^Zen/);
    await tapTab('Areas');
    await tap(/^Atruvia/);
    expectShows(/^Show \d+ done tasks?$/);
  });
});

/**
 * Before this work (P0, as on the device): Quick Add 6, ItemDetail 5, ProjectDataPanel 7 renders and 8 settings
 * reads per open. P1 (settings from the snapshot): 3, 3, 3 and none. P2 (stable Quick Add props): Quick Add 1.
 * P3 (a cached item in the first render): every part of the page once. P4 (Quick Add builds its other tabs after
 * the e-ink flush): Quick Add twice - once with the Todo tab, once after the page is on screen - plus once for a
 * kept screen's Quick Add (Daily) at its own first flush.
 */
const LIMITS = {quickAdd: 3, itemDetail: 1, projectDataPanel: 1, settingsReads: 0};
/** Once per open since P3; FileBrowserPane and the Threads tab inside it since P6 (no hidden listing). */
const ONCE = ['ItemStatusPanel', 'TodosSection', 'MeetingsSection', 'MarksCard', 'FileBrowserPane', 'ThreadsTab'];
