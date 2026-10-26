// docs/dev/history/technical-design-perf-current-page.md §6 scenarios 2-8, §7: work done per open of a
// Current page on the fake device - renders per component (test-helpers/renderCounts.ts) and settings
// reads. The limits are the design's targets as far as the steps have reached them.
jest.mock('../../src/utils/perf', () => require('../../test-helpers/renderCounts').perfWithRenderCounts());

import AsyncStorage from '@react-native-async-storage/async-storage';
import {openApp, settle, tap, tapTab} from '../../test-helpers/scenario/app';
import {putFile} from '../../test-helpers/scenario/files';
import {and, given, scenario, then, when} from '../../test-helpers/scenario/scenario';
import {BIG_NOW, bigScopeFiles, bigScopeSettings} from '../../test-helpers/bigScope';
import {renderCounts, resetRenderCounts} from '../../test-helpers/renderCounts';

const SETTINGS_KEY = 'gtdpara:settings:v1';

/** Only the clock is faked: timers stay real, so the app's settling works as everywhere else. */
function clock(): void {
  jest.useFakeTimers({
    now: BIG_NOW,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
  });
}
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
    }
  });
  and('the settings are read at most as often as recorded', () => {
    for (const w of Object.values(work)) expect(w.settingsReads).toBeLessThanOrEqual(LIMITS.settingsReads);
    // The numbers for the step report.
    process.stdout.write(`currentPagePerf: ${JSON.stringify(work)}\n`);
  });
});

/**
 * Before this work (P0, as on the device): Quick Add 6, ItemDetail 5, ProjectDataPanel 7 renders and 8 settings
 * reads per open. P1 (settings from the snapshot): 3, 3, 3 and none.
 */
const LIMITS = {quickAdd: 3, itemDetail: 3, projectDataPanel: 3, settingsReads: 0};
